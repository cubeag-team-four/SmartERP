package com.cubeage.erp.auth.service;

import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.admin.repository.UserRepository;
import com.cubeage.erp.auth.dto.MfaSetupResponse;
import com.cubeage.erp.auth.dto.MfaStatusResponse;
import com.cubeage.erp.auth.entity.MfaRecoveryCode;
import com.cubeage.erp.auth.exception.AuthException;
import com.cubeage.erp.auth.repository.MfaRecoveryCodeRepository;
import com.cubeage.erp.auth.security.SecretCipher;
import com.cubeage.erp.auth.security.TokenHasher;
import com.cubeage.erp.auth.security.TotpService;
import com.cubeage.erp.security.Roles;
import com.cubeage.erp.settings.entity.SecuritySetting;
import com.cubeage.erp.settings.repository.SecuritySettingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalLong;

/**
 * TOTP multi-factor authentication.
 *
 * <ul>
 *   <li>Mandatory for SUPER_ADMIN and TENANT_ADMIN; other roles when the company's security
 *       settings set {@code mfa_required}.</li>
 *   <li>Secrets are AES-GCM encrypted at rest and only revealed once, during enrollment.</li>
 *   <li>Enrollment is confirmed with a valid code before MFA is switched on.</li>
 *   <li>Eight single-use recovery codes, stored as SHA-256, regenerated on demand.</li>
 *   <li>Accepted codes are remembered (time step) so a code cannot be replayed.</li>
 * </ul>
 */
@Service
public class MfaService {

    public static final int RECOVERY_CODE_COUNT = 8;

    private final UserRepository userRepository;
    private final MfaRecoveryCodeRepository recoveryCodeRepository;
    private final SecuritySettingRepository securitySettingRepository;
    private final TotpService totpService;
    private final SecretCipher secretCipher;
    private final SecurityAuditService audit;
    private final boolean enforcePrivileged;
    private final String issuer;

    public MfaService(UserRepository userRepository,
                      MfaRecoveryCodeRepository recoveryCodeRepository,
                      SecuritySettingRepository securitySettingRepository,
                      TotpService totpService,
                      SecretCipher secretCipher,
                      SecurityAuditService audit,
                      @Value("${app.security.mfa.enforce-privileged:true}") boolean enforcePrivileged,
                      @Value("${app.security.mfa.issuer:SmartERP}") String issuer) {
        this.userRepository = userRepository;
        this.recoveryCodeRepository = recoveryCodeRepository;
        this.securitySettingRepository = securitySettingRepository;
        this.totpService = totpService;
        this.secretCipher = secretCipher;
        this.audit = audit;
        this.enforcePrivileged = enforcePrivileged;
        this.issuer = issuer;
    }

    public boolean isRequired(User user) {
        if (enforcePrivileged && Roles.MFA_MANDATORY.stream().anyMatch(r -> SessionService.hasRole(user, r))) {
            return true;
        }
        return securitySettingRepository.findByTenantId(user.getTenantId())
                .map(SecuritySetting::getMfaRequired).map(Boolean.TRUE::equals).orElse(false);
    }

    public boolean isEnabled(User user) {
        return Boolean.TRUE.equals(user.getMfaEnabled()) && user.getMfaSecret() != null;
    }

    /** Generates a new pending secret (replacing any unconfirmed one). */
    @Transactional
    public MfaSetupResponse beginSetup(User user) {
        if (isEnabled(user)) {
            throw new AuthException(HttpStatus.CONFLICT, "MFA_ALREADY_ENABLED", "Two-factor authentication is already enabled");
        }
        String secret = totpService.generateSecret();
        user.setMfaSecret(secretCipher.encrypt(secret));
        user.setMfaEnabled(false);
        user.setMfaLastUsedStep(null);
        userRepository.save(user);
        return new MfaSetupResponse(secret, totpService.otpAuthUri(issuer, user.getEmail(), secret), issuer, user.getEmail());
    }

    /** Confirms enrollment with a code from the app; returns the one-time recovery codes. */
    @Transactional(noRollbackFor = AuthException.class)
    public List<String> enable(User user, String code, ClientInfo client) {
        if (isEnabled(user)) {
            throw new AuthException(HttpStatus.CONFLICT, "MFA_ALREADY_ENABLED", "Two-factor authentication is already enabled");
        }
        if (user.getMfaSecret() == null) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "MFA_SETUP_REQUIRED", "Start two-factor setup first");
        }
        OptionalLong step = totpService.verify(secretCipher.decrypt(user.getMfaSecret()), code, null);
        if (step.isEmpty()) {
            audit.failure(user.getTenantId(), user.getId(), "MFA_ENROLL", "Invalid confirmation code", client);
            throw AuthException.invalidMfa();
        }
        user.setMfaEnabled(true);
        user.setMfaEnrolledAt(Instant.now());
        user.setMfaLastUsedStep(step.getAsLong());
        userRepository.save(user);
        List<String> codes = replaceRecoveryCodes(user);
        audit.success(user.getTenantId(), user.getId(), "MFA_ENABLED", client);
        return codes;
    }

    /**
     * Checks a second factor. Exactly one of {@code code} / {@code recoveryCode} is expected.
     * A used recovery code is consumed; a used TOTP step is remembered (no replay).
     */
    @Transactional
    public boolean verify(User user, String code, String recoveryCode, ClientInfo client) {
        if (!isEnabled(user)) return false;
        if (recoveryCode != null && !recoveryCode.isBlank()) {
            String hash = TokenHasher.sha256Hex(TokenHasher.normalizeRecoveryCode(recoveryCode));
            return recoveryCodeRepository.findByUserIdAndCodeHashAndUsedAtIsNull(user.getId(), hash)
                    .map(rc -> {
                        rc.setUsedAt(Instant.now());
                        recoveryCodeRepository.save(rc);
                        audit.record(user.getTenantId(), user.getId(), "MFA_RECOVERY_CODE_USED", "SUCCESS", "USER", user.getId(),
                                "Remaining codes: " + recoveryCodeRepository.countByUserIdAndUsedAtIsNull(user.getId()), client);
                        return true;
                    })
                    .orElse(false);
        }
        OptionalLong step = totpService.verify(secretCipher.decrypt(user.getMfaSecret()), code, user.getMfaLastUsedStep());
        if (step.isEmpty()) return false;
        user.setMfaLastUsedStep(step.getAsLong());
        userRepository.save(user);
        return true;
    }

    /** Requires a current TOTP code; invalidates all previous recovery codes. */
    @Transactional(noRollbackFor = AuthException.class)
    public List<String> regenerateRecoveryCodes(User user, String code, ClientInfo client) {
        if (!isEnabled(user)) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "MFA_NOT_ENABLED", "Two-factor authentication is not enabled");
        }
        if (!verify(user, code, null, client)) {
            audit.failure(user.getTenantId(), user.getId(), "MFA_RECOVERY_CODES_REGENERATED", "Invalid code", client);
            throw AuthException.invalidMfa();
        }
        List<String> codes = replaceRecoveryCodes(user);
        audit.success(user.getTenantId(), user.getId(), "MFA_RECOVERY_CODES_REGENERATED", client);
        return codes;
    }

    /** Self-service disable; not allowed where MFA is mandatory. Caller verifies the password. */
    @Transactional(noRollbackFor = AuthException.class)
    public void disable(User user, String code, ClientInfo client) {
        if (isRequired(user)) {
            throw new AuthException(HttpStatus.FORBIDDEN, "MFA_REQUIRED_BY_POLICY",
                    "Two-factor authentication is required for your role or company and cannot be turned off");
        }
        if (!verify(user, code, null, client)) {
            audit.failure(user.getTenantId(), user.getId(), "MFA_DISABLED", "Invalid code", client);
            throw AuthException.invalidMfa();
        }
        clear(user);
        audit.success(user.getTenantId(), user.getId(), "MFA_DISABLED", client);
    }

    /** Administrator reset for a user who lost their device; caller must revoke sessions too. */
    @Transactional
    public void adminReset(User target, Long actorUserId, ClientInfo client) {
        clear(target);
        audit.record(target.getTenantId(), actorUserId, "MFA_RESET_BY_ADMIN", "SUCCESS", "USER", target.getId(), null, client);
    }

    public MfaStatusResponse status(User user) {
        return new MfaStatusResponse(isEnabled(user), isRequired(user), user.getMfaEnrolledAt(),
                isEnabled(user) ? recoveryCodeRepository.countByUserIdAndUsedAtIsNull(user.getId()) : 0);
    }

    private void clear(User user) {
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setMfaEnrolledAt(null);
        user.setMfaLastUsedStep(null);
        userRepository.save(user);
        recoveryCodeRepository.deleteAllByUserId(user.getId());
    }

    private List<String> replaceRecoveryCodes(User user) {
        recoveryCodeRepository.deleteAllByUserId(user.getId());
        List<String> plain = new ArrayList<>(RECOVERY_CODE_COUNT);
        for (int i = 0; i < RECOVERY_CODE_COUNT; i++) {
            String code = TokenHasher.recoveryCode();
            plain.add(code);
            recoveryCodeRepository.save(MfaRecoveryCode.builder()
                    .userId(user.getId())
                    .codeHash(TokenHasher.sha256Hex(TokenHasher.normalizeRecoveryCode(code)))
                    .build());
        }
        return plain;
    }
}
