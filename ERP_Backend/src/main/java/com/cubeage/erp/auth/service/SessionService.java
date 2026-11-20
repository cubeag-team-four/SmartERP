package com.cubeage.erp.auth.service;

import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.admin.repository.UserRepository;
import com.cubeage.erp.auth.dto.LoginResponse;
import com.cubeage.erp.auth.entity.RefreshToken;
import com.cubeage.erp.auth.exception.AuthException;
import com.cubeage.erp.auth.repository.RefreshTokenRepository;
import com.cubeage.erp.auth.security.TokenHasher;
import com.cubeage.erp.security.Roles;
import com.cubeage.erp.security.jwt.JwtService;
import com.cubeage.erp.security.user.UserPrincipal;
import com.cubeage.erp.tenant.entity.Tenant;
import com.cubeage.erp.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Session lifecycle (SRS 8.7, 12.1): 15-minute access JWTs plus 7-day refresh tokens that are
 * stored hashed, rotated on every use, and grouped into families so reuse of an already-rotated
 * token revokes the whole family.
 */
@Service
@RequiredArgsConstructor
public class SessionService {

    /** Login-time role precedence, so the frontend always routes a multi-role user the same way. */
    private static final List<String> ROLE_PRECEDENCE = List.of(
            Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.FINANCE_MANAGER, Roles.SALES_MANAGER,
            Roles.HR_MANAGER, Roles.OPERATIONS_MANAGER, Roles.INVENTORY_MANAGER, Roles.EMPLOYEE);

    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final SecurityAuditService audit;

    @Value("${app.security.refresh-token.expiration-ms:604800000}")
    private long refreshTokenTtlMs;

    /** A fully authenticated session: response body plus the raw refresh token for the cookie. */
    public record IssuedSession(LoginResponse body, String refreshToken, Duration refreshTtl) { }

    /** Starts a new session (new refresh-token family) after all login factors succeeded. */
    @Transactional
    public IssuedSession start(User user, ClientInfo client) {
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        return issue(user, UUID.randomUUID().toString(), client);
    }

    /**
     * Exchanges a refresh token for a new access + refresh token pair.
     * Reuse of a revoked token is treated as theft: the whole family is revoked.
     * Runs in its own transaction so the family revocation survives the thrown exception.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = AuthException.class)
    public IssuedSession rotate(String rawRefreshToken, ClientInfo client) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) throw AuthException.invalidRefresh();
        RefreshToken stored = refreshTokenRepository.findByTokenHash(TokenHasher.sha256Hex(rawRefreshToken))
                .orElseThrow(AuthException::invalidRefresh);

        if (Boolean.TRUE.equals(stored.getRevoked())) {
            if (stored.getFamilyId() != null && "ROTATED".equals(stored.getRevokedReason())) {
                refreshTokenRepository.revokeFamily(stored.getFamilyId(), "REUSE_DETECTED");
                audit.record(stored.getTenantId(), stored.getUserId(), "REFRESH_TOKEN_REUSE", "DENIED",
                        "USER", stored.getUserId(), "Rotated refresh token presented again; session family revoked", client);
            }
            throw AuthException.invalidRefresh();
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            stored.revoke("EXPIRED");
            refreshTokenRepository.save(stored);
            throw AuthException.invalidRefresh();
        }

        User user = userRepository.findById(stored.getUserId())
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .orElse(null);
        if (user == null) {
            refreshTokenRepository.revokeFamily(stored.getFamilyId(), "USER_INACTIVE");
            throw AuthException.invalidRefresh();
        }
        if (!tenantUsable(user)) {
            throw new AuthException(org.springframework.http.HttpStatus.FORBIDDEN, "TENANT_INACTIVE",
                    "Your company account is not active. Contact your administrator.");
        }

        stored.revoke("ROTATED");
        refreshTokenRepository.save(stored);
        return issue(user, stored.getFamilyId() == null ? UUID.randomUUID().toString() : stored.getFamilyId(), client);
    }

    /** Ends one session (the family of the presented refresh token). */
    @Transactional
    public void endSession(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        refreshTokenRepository.findByTokenHash(TokenHasher.sha256Hex(rawRefreshToken)).ifPresent(token -> {
            if (token.getFamilyId() != null) {
                refreshTokenRepository.revokeFamily(token.getFamilyId(), "LOGOUT");
            } else {
                token.revoke("LOGOUT");
                refreshTokenRepository.save(token);
            }
        });
    }

    /**
     * Invalidates every session of the user: all refresh tokens are revoked and the token
     * version is bumped so outstanding access tokens stop working on their next request.
     * Used on password change/reset, deactivation, role change and MFA reset.
     */
    @Transactional
    public void revokeAllSessions(User user, String reason) {
        user.bumpTokenVersion();
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(user.getId(), reason);
    }

    public boolean tenantUsable(User user) {
        if (hasRole(user, Roles.SUPER_ADMIN)) return true;
        return tenantRepository.findById(user.getTenantId())
                .map(t -> t.getStatus() == com.cubeage.erp.tenant.enums.TenantStatus.ACTIVE
                        || t.getStatus() == com.cubeage.erp.tenant.enums.TenantStatus.TRIAL)
                .orElse(false);
    }

    /** Identity fields shared by every login-step response. */
    public LoginResponse.LoginResponseBuilder identity(User user) {
        List<String> roles = roleNames(user);
        return LoginResponse.builder()
                .userId(user.getId())
                .tenantId(user.getTenantId())
                .tenantCode(tenantRepository.findById(user.getTenantId()).map(Tenant::getCode).orElse(null))
                .name(user.getName())
                .email(user.getEmail())
                .roles(roles)
                .role(roles.isEmpty() ? null : roles.get(0))
                .mfaEnabled(Boolean.TRUE.equals(user.getMfaEnabled()));
    }

    public static List<String> roleNames(User user) {
        return user.getRoles().stream().map(Role::getName).map(Roles::normalize).distinct()
                .sorted(Comparator.comparingInt((String r) -> {
                    int i = ROLE_PRECEDENCE.indexOf(r);
                    return i < 0 ? Integer.MAX_VALUE : i;
                }).thenComparing(Comparator.naturalOrder()))
                .toList();
    }

    public static boolean hasRole(User user, String role) {
        return user.getRoles().stream().anyMatch(r -> Roles.normalize(r.getName()).equals(role));
    }

    private IssuedSession issue(User user, String familyId, ClientInfo client) {
        String raw = TokenHasher.randomToken(32);
        refreshTokenRepository.save(RefreshToken.builder()
                .tokenHash(TokenHasher.sha256Hex(raw))
                .userId(user.getId())
                .tenantId(user.getTenantId())
                .familyId(familyId)
                .expiresAt(Instant.now().plusMillis(refreshTokenTtlMs))
                .ipAddress(client == null ? null : client.ip())
                .userAgent(client == null ? null : client.userAgent())
                .build());
        LoginResponse body = identity(user)
                .status(LoginResponse.AUTHENTICATED)
                .accessToken(jwtService.issueAccessToken(UserPrincipal.from(user)))
                .tokenType("Bearer")
                .expiresIn(jwtService.accessTokenTtlSeconds())
                .build();
        return new IssuedSession(body, raw, Duration.ofMillis(refreshTokenTtlMs));
    }
}
