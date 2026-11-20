package com.cubeage.erp.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.util.List;

/**
 * Result of a login step.
 * <ul>
 *   <li>{@code AUTHENTICATED}: access token issued; the refresh token is set as an HttpOnly cookie.</li>
 *   <li>{@code MFA_REQUIRED}: submit a TOTP or recovery code with {@code mfaToken} to /auth/mfa/verify.</li>
 *   <li>{@code MFA_ENROLLMENT_REQUIRED}: this role/company requires MFA; enroll via /auth/mfa/setup
 *       and /auth/mfa/enable using {@code mfaToken}.</li>
 * </ul>
 */
@Builder(toBuilder = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
        String status,
        String mfaToken,
        String accessToken,
        String tokenType,
        Long expiresIn,
        Long userId,
        Long tenantId,
        String tenantCode,
        String name,
        String email,
        String role,
        List<String> roles,
        Boolean mfaEnabled,
        List<String> recoveryCodes) {

    public static final String AUTHENTICATED = "AUTHENTICATED";
    public static final String MFA_REQUIRED = "MFA_REQUIRED";
    public static final String MFA_ENROLLMENT_REQUIRED = "MFA_ENROLLMENT_REQUIRED";
}
