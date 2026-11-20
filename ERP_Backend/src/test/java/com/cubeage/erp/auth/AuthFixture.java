package com.cubeage.erp.auth;

import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.admin.repository.UserRepository;
import com.cubeage.erp.auth.entity.MfaRecoveryCode;
import com.cubeage.erp.auth.entity.PasswordResetToken;
import com.cubeage.erp.auth.entity.RefreshToken;
import com.cubeage.erp.auth.repository.*;
import com.cubeage.erp.auth.security.*;
import com.cubeage.erp.auth.service.*;
import com.cubeage.erp.security.jwt.JwtService;
import com.cubeage.erp.settings.entity.AuditLog;
import com.cubeage.erp.settings.repository.AuditLogRepository;
import com.cubeage.erp.settings.repository.SecuritySettingRepository;
import com.cubeage.erp.tenant.entity.Tenant;
import com.cubeage.erp.tenant.enums.TenantStatus;
import com.cubeage.erp.tenant.repository.TenantRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Wires the real auth services together over in-memory repositories (Mockito answers backed
 * by maps), so lockout counters, token rotation, recovery-code consumption and audit writes
 * behave as they would against the database.
 */
public class AuthFixture {

    public static final String PASSWORD = "Granite!Harbor42";

    public final AtomicLong ids = new AtomicLong(100);
    public final Map<Long, User> users = new LinkedHashMap<>();
    public final Map<Long, Tenant> tenants = new HashMap<>();
    public final List<RefreshToken> refreshTokens = new ArrayList<>();
    public final List<MfaRecoveryCode> recoveryCodes = new ArrayList<>();
    public final List<PasswordResetToken> resetTokens = new ArrayList<>();
    public final List<AuditLog> auditLogs = new ArrayList<>();
    public final List<String> sentResetLinks = new ArrayList<>();

    public final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    public final JwtService jwtService = new JwtService(Base64.getEncoder().encodeToString(new byte[48]), 900_000);
    public final TotpService totp = new TotpService();
    public final SecretCipher cipher = new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
    public final RateLimiter rateLimiter = new RateLimiter();

    public final UserRepository userRepository = mock(UserRepository.class);
    public final TenantRepository tenantRepository = mock(TenantRepository.class);
    public final RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
    public final MfaRecoveryCodeRepository recoveryCodeRepository = mock(MfaRecoveryCodeRepository.class);
    public final PasswordResetTokenRepository resetTokenRepository = mock(PasswordResetTokenRepository.class);
    public final SecuritySettingRepository securitySettingRepository = mock(SecuritySettingRepository.class);
    public final AuditLogRepository auditLogRepository = mock(AuditLogRepository.class);
    public final PasswordPolicyService passwordPolicy = mock(PasswordPolicyService.class);

    public final SecurityAuditService audit;
    public final SessionService sessions;
    public final MfaService mfa;
    public final AuthService auth;

    public AuthFixture() {
        when(userRepository.save(any())).thenAnswer(inv -> store(inv.getArgument(0)));
        when(userRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(users.get((Long) inv.getArgument(0))));
        when(userRepository.findAllByEmailIgnoreCase(anyString())).thenAnswer(inv ->
                users.values().stream().filter(u -> u.getEmail().equalsIgnoreCase(inv.getArgument(0))).toList());
        when(tenantRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(tenants.get((Long) inv.getArgument(0))));
        when(tenantRepository.findByCodeIgnoreCase(anyString())).thenAnswer(inv ->
                tenants.values().stream().filter(t -> t.getCode().equalsIgnoreCase(inv.getArgument(0))).findFirst());
        when(securitySettingRepository.findByTenantId(any())).thenReturn(Optional.empty());

        when(refreshTokenRepository.save(any())).thenAnswer(inv -> {
            RefreshToken t = inv.getArgument(0);
            if (t.getId() == null) { t.setId(ids.incrementAndGet()); refreshTokens.add(t); }
            return t;
        });
        when(refreshTokenRepository.findByTokenHash(anyString())).thenAnswer(inv ->
                refreshTokens.stream().filter(t -> t.getTokenHash().equals(inv.getArgument(0))).findFirst());
        when(refreshTokenRepository.revokeFamily(anyString(), anyString())).thenAnswer(inv -> {
            refreshTokens.stream().filter(t -> inv.getArgument(0).equals(t.getFamilyId()) && !t.getRevoked())
                    .forEach(t -> t.revoke(inv.getArgument(1)));
            return 1;
        });
        when(refreshTokenRepository.revokeAllByUserId(anyLong(), anyString())).thenAnswer(inv -> {
            refreshTokens.stream().filter(t -> t.getUserId().equals(inv.getArgument(0)) && !t.getRevoked())
                    .forEach(t -> t.revoke(inv.getArgument(1)));
            return 1;
        });

        when(recoveryCodeRepository.save(any())).thenAnswer(inv -> {
            MfaRecoveryCode c = inv.getArgument(0);
            if (c.getId() == null) { c.setId(ids.incrementAndGet()); recoveryCodes.add(c); }
            return c;
        });
        when(recoveryCodeRepository.findByUserIdAndCodeHashAndUsedAtIsNull(anyLong(), anyString())).thenAnswer(inv ->
                recoveryCodes.stream().filter(c -> c.getUserId().equals(inv.getArgument(0))
                        && c.getCodeHash().equals(inv.getArgument(1)) && c.getUsedAt() == null).findFirst());
        when(recoveryCodeRepository.countByUserIdAndUsedAtIsNull(anyLong())).thenAnswer(inv ->
                recoveryCodes.stream().filter(c -> c.getUserId().equals(inv.getArgument(0)) && c.getUsedAt() == null).count());
        doAnswer(inv -> recoveryCodes.removeIf(c -> c.getUserId().equals(inv.getArgument(0))))
                .when(recoveryCodeRepository).deleteAllByUserId(anyLong());

        when(resetTokenRepository.save(any())).thenAnswer(inv -> {
            PasswordResetToken t = inv.getArgument(0);
            if (t.getId() == null) { t.setId(ids.incrementAndGet()); resetTokens.add(t); }
            return t;
        });
        when(resetTokenRepository.findByTokenHash(anyString())).thenAnswer(inv ->
                resetTokens.stream().filter(t -> t.getTokenHash().equals(inv.getArgument(0))).findFirst());
        when(resetTokenRepository.invalidateAllForUser(anyLong(), any())).thenAnswer(inv -> {
            resetTokens.stream().filter(t -> t.getUserId().equals(inv.getArgument(0)) && t.getUsedAt() == null)
                    .forEach(t -> t.setUsedAt(inv.getArgument(1)));
            return 1;
        });

        when(auditLogRepository.save(any())).thenAnswer(inv -> { auditLogs.add(inv.getArgument(0)); return inv.getArgument(0); });

        audit = new SecurityAuditService(auditLogRepository);
        sessions = new SessionService(jwtService, refreshTokenRepository, userRepository, tenantRepository, audit);
        ReflectionTestUtils.setField(sessions, "refreshTokenTtlMs", 604_800_000L);
        mfa = new MfaService(userRepository, recoveryCodeRepository, securitySettingRepository, totp, cipher, audit, true, "SmartERP");
        PasswordResetNotifier notifier = (user, link, ttl) -> sentResetLinks.add(link);
        auth = new AuthService(userRepository, tenantRepository, securitySettingRepository, resetTokenRepository, encoder,
                passwordPolicy, jwtService, sessions, mfa, audit, rateLimiter, notifier, 5, 15, 15, 30,
                "http://app/reset-password");
    }

    private User store(User u) {
        if (u.getId() == null) u.setId(ids.incrementAndGet());
        users.put(u.getId(), u);
        return u;
    }

    public Tenant tenant(String code, TenantStatus status) {
        Tenant t = Tenant.builder().id(ids.incrementAndGet()).code(code).name(code.toUpperCase()).status(status).build();
        tenants.put(t.getId(), t);
        return t;
    }

    public User user(Tenant tenant, String email, String... roles) {
        Set<Role> roleSet = new HashSet<>();
        for (String r : roles) roleSet.add(Role.builder().id(ids.incrementAndGet()).tenantId(tenant.getId()).name(r).build());
        return store(User.builder().tenantId(tenant.getId()).name("Test User").email(email).position("Staff")
                .passwordHash(encoder.encode(PASSWORD)).active(true).roles(roleSet).build());
    }

    public long auditCount(String action, String outcome) {
        return auditLogs.stream().filter(a -> a.getAction().equals(action) && Objects.equals(a.getOutcome(), outcome)).count();
    }

    /** Current code for a user's enrolled secret, as an authenticator app would show. */
    public String currentCode(User user) {
        byte[] key = decodeBase32(cipher.decrypt(user.getMfaSecret()));
        return codeAt(key, Instant.now().getEpochSecond() / 30);
    }

    public String codeForStep(User user, long stepOffset) {
        byte[] key = decodeBase32(cipher.decrypt(user.getMfaSecret()));
        return codeAt(key, Instant.now().getEpochSecond() / 30 + stepOffset);
    }

    private static byte[] decodeBase32(String s) {
        return (byte[]) ReflectionTestUtils.invokeMethod(TotpService.class, "base32Decode", s);
    }

    private static String codeAt(byte[] key, long step) {
        return (String) ReflectionTestUtils.invokeMethod(TotpService.class, "codeAt", key, step);
    }
}
