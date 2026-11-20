package com.cubeage.erp.auth.service;

import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.admin.repository.UserRepository;
import com.cubeage.erp.auth.dto.*;
import com.cubeage.erp.auth.entity.PasswordResetToken;
import com.cubeage.erp.auth.exception.AuthException;
import com.cubeage.erp.auth.repository.PasswordResetTokenRepository;
import com.cubeage.erp.auth.security.PasswordPolicyService;
import com.cubeage.erp.auth.security.RateLimiter;
import com.cubeage.erp.auth.security.TokenHasher;
import com.cubeage.erp.security.jwt.JwtService;
import com.cubeage.erp.security.user.UserPrincipal;
import com.cubeage.erp.settings.entity.SecuritySetting;
import com.cubeage.erp.settings.repository.SecuritySettingRepository;
import com.cubeage.erp.tenant.entity.Tenant;
import com.cubeage.erp.tenant.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Login, MFA step-up, password change and password reset (SRS 8.7, 11.1, 12.4).
 *
 * <p>Account protection: after {@code max_login_attempts} (default 5) failures within the
 * window (15 min) the account is locked for the lockout duration (15 min). The lock is
 * temporary so an attacker cannot lock a user out permanently. Unknown emails get the same
 * treatment in memory so lock responses do not reveal which accounts exist.
 */
@Service
public class AuthService {

    public static final String MFA_PURPOSE_VERIFY = "VERIFY";
    public static final String MFA_PURPOSE_ENROLL = "ENROLL";

    /** Real hash of a random value, compared against for unknown emails so timing does not reveal them. */
    private final String dummyHash;

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final SecuritySettingRepository securitySettingRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyService passwordPolicy;
    private final JwtService jwtService;
    private final SessionService sessions;
    private final MfaService mfa;
    private final SecurityAuditService audit;
    private final RateLimiter rateLimiter;
    private final PasswordResetNotifier resetNotifier;

    private final int defaultMaxAttempts;
    private final Duration failureWindow;
    private final Duration lockoutDuration;
    private final Duration resetTokenTtl;
    private final String resetLinkBase;

    public AuthService(UserRepository userRepository, TenantRepository tenantRepository,
                       SecuritySettingRepository securitySettingRepository,
                       PasswordResetTokenRepository resetTokenRepository, PasswordEncoder passwordEncoder,
                       PasswordPolicyService passwordPolicy, JwtService jwtService, SessionService sessions,
                       MfaService mfa, SecurityAuditService audit, RateLimiter rateLimiter,
                       PasswordResetNotifier resetNotifier,
                       @Value("${app.security.lockout.max-attempts:5}") int defaultMaxAttempts,
                       @Value("${app.security.lockout.window-minutes:15}") long windowMinutes,
                       @Value("${app.security.lockout.duration-minutes:15}") long lockoutMinutes,
                       @Value("${app.security.password-reset.ttl-minutes:30}") long resetTtlMinutes,
                       @Value("${app.security.password-reset.link-base:http://localhost:5173/reset-password}") String resetLinkBase) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.securitySettingRepository = securitySettingRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.jwtService = jwtService;
        this.sessions = sessions;
        this.mfa = mfa;
        this.audit = audit;
        this.rateLimiter = rateLimiter;
        this.resetNotifier = resetNotifier;
        this.defaultMaxAttempts = defaultMaxAttempts;
        this.failureWindow = Duration.ofMinutes(windowMinutes);
        this.lockoutDuration = Duration.ofMinutes(lockoutMinutes);
        this.resetTokenTtl = Duration.ofMinutes(resetTtlMinutes);
        this.resetLinkBase = resetLinkBase;
        this.dummyHash = passwordEncoder.encode(TokenHasher.randomToken(16));
    }

    /** Outcome of a login step: either a full session or an MFA challenge (session == null). */
    public record LoginResult(LoginResponse body, SessionService.IssuedSession session) { }

    // ---------------------------------------------------------------------------- login

    @Transactional(noRollbackFor = AuthException.class)
    public LoginResult login(LoginRequest request, ClientInfo client) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        List<User> candidates = userRepository.findAllByEmailIgnoreCase(email);
        if (request.tenantCode() != null && !request.tenantCode().isBlank()) {
            Long tenantId = tenantRepository.findByCodeIgnoreCase(request.tenantCode().trim()).map(Tenant::getId).orElse(-1L);
            candidates = candidates.stream().filter(u -> u.getTenantId().equals(tenantId)).toList();
        }

        if (candidates.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash);   // equalise timing
            String key = "unknown-login:" + email;
            if (rateLimiter.count(key, failureWindow) >= defaultMaxAttempts) throw AuthException.locked();
            rateLimiter.tryAcquire(key, Integer.MAX_VALUE, failureWindow);
            audit.record(null, null, "LOGIN", "FAILURE", null, null, "Unknown account", client);
            throw AuthException.invalidCredentials();
        }

        Instant now = Instant.now();
        if (candidates.stream().allMatch(u -> u.isLocked(now))) {
            candidates.forEach(u -> audit.failure(u.getTenantId(), u.getId(), "LOGIN", "Account locked", client));
            throw AuthException.locked();
        }

        List<User> unlocked = candidates.stream().filter(u -> !u.isLocked(now)).toList();
        List<User> matching = unlocked.stream()
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash())).toList();

        if (matching.isEmpty()) {
            unlocked.forEach(u -> registerFailure(u, "Bad password", client));
            throw AuthException.invalidCredentials();
        }
        if (matching.size() > 1) {
            // Password verified for several companies: offer the choice (does not leak anything new).
            List<TenantOption> options = matching.stream()
                    .map(u -> tenantRepository.findById(u.getTenantId()).map(t -> new TenantOption(t.getCode(), t.getName())).orElse(null))
                    .filter(Objects::nonNull).toList();
            throw new AuthException(HttpStatus.CONFLICT, "TENANT_SELECTION_REQUIRED",
                    "This email belongs to more than one company. Choose the company to sign in to.", options);
        }

        User user = matching.get(0);
        if (!Boolean.TRUE.equals(user.getActive())) {
            audit.failure(user.getTenantId(), user.getId(), "LOGIN", "Account inactive", client);
            throw AuthException.invalidCredentials();
        }
        if (!sessions.tenantUsable(user)) {
            audit.failure(user.getTenantId(), user.getId(), "LOGIN", "Company inactive", client);
            throw new AuthException(HttpStatus.FORBIDDEN, "TENANT_INACTIVE", "Your company account is not active. Contact your administrator.");
        }
        clearFailures(user);

        if (mfa.isEnabled(user)) {
            audit.record(user.getTenantId(), user.getId(), "LOGIN_PASSWORD_OK", "SUCCESS", "USER", user.getId(), "MFA challenge issued", client);
            return new LoginResult(mfaChallenge(user, LoginResponse.MFA_REQUIRED, MFA_PURPOSE_VERIFY), null);
        }
        if (mfa.isRequired(user)) {
            audit.record(user.getTenantId(), user.getId(), "LOGIN_PASSWORD_OK", "SUCCESS", "USER", user.getId(), "MFA enrollment required", client);
            return new LoginResult(mfaChallenge(user, LoginResponse.MFA_ENROLLMENT_REQUIRED, MFA_PURPOSE_ENROLL), null);
        }
        SessionService.IssuedSession session = sessions.start(user, client);
        audit.success(user.getTenantId(), user.getId(), "LOGIN", client);
        return new LoginResult(session.body(), session);
    }

    // ------------------------------------------------------------------------------ MFA

    @Transactional(noRollbackFor = AuthException.class)
    public SessionService.IssuedSession verifyMfa(MfaVerifyRequest request, ClientInfo client) {
        User user = userFromMfaToken(request.mfaToken(), MFA_PURPOSE_VERIFY);
        if (user.isLocked(Instant.now())) throw AuthException.locked();
        if (!mfa.verify(user, request.code(), request.recoveryCode(), client)) {
            registerFailure(user, "Invalid MFA code", client);
            throw AuthException.invalidMfa();
        }
        clearFailures(user);
        SessionService.IssuedSession session = sessions.start(user, client);
        audit.success(user.getTenantId(), user.getId(), "LOGIN", client);
        return session;
    }

    /** Enrollment start: from the login flow (mfaToken) or from account settings (principal). */
    @Transactional
    public MfaSetupResponse mfaSetup(String mfaToken, UserPrincipal principal) {
        return mfa.beginSetup(enrollmentUser(mfaToken, principal));
    }

    /**
     * Confirms enrollment. From the login flow this also completes sign-in; from settings it
     * returns only the recovery codes (session == null).
     */
    @Transactional(noRollbackFor = AuthException.class)
    public LoginResult mfaEnable(MfaEnableRequest request, UserPrincipal principal, ClientInfo client) {
        User user = enrollmentUser(request.mfaToken(), principal);
        List<String> codes = mfa.enable(user, request.code(), client);
        if (principal != null) {
            return new LoginResult(LoginResponse.builder().mfaEnabled(true).recoveryCodes(codes).build(), null);
        }
        SessionService.IssuedSession session = sessions.start(user, client);
        audit.success(user.getTenantId(), user.getId(), "LOGIN", client);
        LoginResponse body = session.body().toBuilder().recoveryCodes(codes).build();
        return new LoginResult(body, new SessionService.IssuedSession(body, session.refreshToken(), session.refreshTtl()));
    }

    @Transactional(noRollbackFor = AuthException.class)
    public void disableMfa(UserPrincipal principal, MfaDisableRequest request, ClientInfo client) {
        User user = requireUser(principal);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            audit.failure(user.getTenantId(), user.getId(), "MFA_DISABLED", "Wrong password", client);
            throw new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD", "Current password is incorrect");
        }
        mfa.disable(user, request.code(), client);
    }

    public RecoveryCodesResponse regenerateRecoveryCodes(UserPrincipal principal, String code, ClientInfo client) {
        return new RecoveryCodesResponse(mfa.regenerateRecoveryCodes(requireUser(principal), code, client));
    }

    public MfaStatusResponse mfaStatus(UserPrincipal principal) {
        return mfa.status(requireUser(principal));
    }

    // ------------------------------------------------------------------ session / identity

    public void logout(UserPrincipal principal, String rawRefreshToken, ClientInfo client) {
        sessions.endSession(rawRefreshToken);
        if (principal != null) {
            User user = requireUser(principal);
            // Kill this device's still-valid access token; other devices recover via their own refresh token.
            user.bumpTokenVersion();
            userRepository.save(user);
            audit.success(user.getTenantId(), user.getId(), "LOGOUT", client);
        }
    }

    public MeResponse me(UserPrincipal principal) {
        User user = requireUser(principal);
        List<String> roles = SessionService.roleNames(user);
        List<String> permissions = principal.getAuthorities().stream().map(a -> a.getAuthority())
                .filter(a -> !a.startsWith("ROLE_")).sorted().toList();
        String tenantCode = tenantRepository.findById(user.getTenantId()).map(Tenant::getCode).orElse(null);
        return new MeResponse(user.getId(), user.getTenantId(), tenantCode, user.getName(), user.getEmail(),
                roles.isEmpty() ? null : roles.get(0), roles, permissions, mfa.isEnabled(user), mfa.isRequired(user));
    }

    public PasswordPolicyResponse passwordPolicy() {
        return new PasswordPolicyResponse(PasswordPolicyService.ABSOLUTE_MIN_LENGTH, PasswordPolicyService.MAX_LENGTH, 3, 5, true);
    }

    // -------------------------------------------------------------------------- passwords

    @Transactional(noRollbackFor = AuthException.class)
    public void changePassword(UserPrincipal principal, ChangePasswordRequest request, ClientInfo client) {
        User user = requireUser(principal);
        if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
            audit.failure(user.getTenantId(), user.getId(), "PASSWORD_CHANGE", "Wrong current password", client);
            throw new AuthException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "PASSWORD_UNCHANGED", "New password must differ from the current one");
        }
        setPassword(user, request.newPassword());
        sessions.revokeAllSessions(user, "PASSWORD_CHANGED");
        audit.success(user.getTenantId(), user.getId(), "PASSWORD_CHANGE", client);
    }

    /** Always succeeds from the caller's point of view, so it cannot be used to probe emails. */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request, ClientInfo client) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        for (User user : userRepository.findAllByEmailIgnoreCase(email)) {
            if (!Boolean.TRUE.equals(user.getActive())) continue;
            resetTokenRepository.invalidateAllForUser(user.getId(), Instant.now());
            String raw = TokenHasher.randomToken(32);
            resetTokenRepository.save(PasswordResetToken.builder()
                    .userId(user.getId())
                    .tokenHash(TokenHasher.sha256Hex(raw))
                    .expiresAt(Instant.now().plus(resetTokenTtl))
                    .requestedIp(client == null ? null : client.ip())
                    .build());
            resetNotifier.sendPasswordReset(user, resetLinkBase + "?token=" + raw, resetTokenTtl);
            audit.success(user.getTenantId(), user.getId(), "PASSWORD_RESET_REQUESTED", client);
        }
    }

    @Transactional(noRollbackFor = AuthException.class)
    public void resetPassword(ResetPasswordRequest request, ClientInfo client) {
        AuthException invalid = new AuthException(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN",
                "This reset link is invalid or has expired. Request a new one.");
        PasswordResetToken token = resetTokenRepository.findByTokenHash(TokenHasher.sha256Hex(request.token()))
                .orElseThrow(() -> invalid);
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(Instant.now())) throw invalid;
        User user = userRepository.findById(token.getUserId())
                .filter(u -> Boolean.TRUE.equals(u.getActive())).orElseThrow(() -> invalid);

        setPassword(user, request.newPassword());           // policy failure leaves the token usable
        resetTokenRepository.invalidateAllForUser(user.getId(), Instant.now());
        clearFailures(user);
        sessions.revokeAllSessions(user, "PASSWORD_RESET");
        audit.success(user.getTenantId(), user.getId(), "PASSWORD_RESET", client);
    }

    /** Validates against policy + history, stores the hash, records history. */
    void setPassword(User user, String newPassword) {
        passwordPolicy.validate(newPassword, user.getEmail(), user.getName(), user.getTenantId(), user.getId());
        if (user.getPasswordHash() != null) {
            passwordPolicy.recordInHistory(user.getId(), user.getPasswordHash());
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(Instant.now());
        userRepository.save(user);
    }

    // ---------------------------------------------------------------------------- helpers

    private LoginResponse mfaChallenge(User user, String status, String purpose) {
        return sessions.identity(user)
                .status(status)
                .mfaToken(jwtService.issueMfaToken(user.getId(), user.getTenantId(), user.getTokenVersion(), purpose))
                .build();
    }

    private User userFromMfaToken(String mfaToken, String purpose) {
        JwtService.MfaClaims claims = jwtService.parseMfaToken(mfaToken)
                .filter(c -> purpose.equals(c.purpose()))
                .orElseThrow(AuthException::mfaSessionExpired);
        User user = userRepository.findById(claims.userId())
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .orElseThrow(AuthException::mfaSessionExpired);
        if (!user.getTenantId().equals(claims.tenantId()) || user.getTokenVersion() != claims.tokenVersion()) {
            throw AuthException.mfaSessionExpired();
        }
        return user;
    }

    private User enrollmentUser(String mfaToken, UserPrincipal principal) {
        if (principal != null) return requireUser(principal);
        return userFromMfaToken(mfaToken, MFA_PURPOSE_ENROLL);
    }

    private User requireUser(UserPrincipal principal) {
        if (principal == null) throw new AuthException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Sign in required");
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Sign in required"));
    }

    private void registerFailure(User user, String reason, ClientInfo client) {
        Instant now = Instant.now();
        int count = user.getFailedLoginCount() == null ? 0 : user.getFailedLoginCount();
        if (user.getLastFailedLoginAt() == null || user.getLastFailedLoginAt().isBefore(now.minus(failureWindow))) {
            count = 0;
        }
        count++;
        user.setLastFailedLoginAt(now);
        if (count >= maxAttempts(user.getTenantId())) {
            user.setLockedUntil(now.plus(lockoutDuration));
            user.setFailedLoginCount(0);
            audit.record(user.getTenantId(), user.getId(), "ACCOUNT_LOCKED", "DENIED", "USER", user.getId(),
                    "Locked for " + lockoutDuration.toMinutes() + " minutes after repeated failures", client);
        } else {
            user.setFailedLoginCount(count);
        }
        userRepository.save(user);
        audit.failure(user.getTenantId(), user.getId(), "LOGIN", reason, client);
    }

    private void clearFailures(User user) {
        if ((user.getFailedLoginCount() != null && user.getFailedLoginCount() > 0) || user.getLockedUntil() != null) {
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }
    }

    private int maxAttempts(Long tenantId) {
        return securitySettingRepository.findByTenantId(tenantId)
                .map(SecuritySetting::getMaxLoginAttempts)
                .filter(n -> n != null && n >= 3 && n <= 10)
                .orElse(defaultMaxAttempts);
    }
}
