package com.cubeage.erp.auth.exception;

import com.cubeage.erp.auth.dto.TenantOption;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Authentication failure with an HTTP status and a stable machine-readable {@code code}
 * (SRS 10.1). Messages are deliberately generic where detail would reveal whether an
 * account exists.
 */
@Getter
public class AuthException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final transient List<TenantOption> tenants;

    public AuthException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    public AuthException(HttpStatus status, String code, String message, List<TenantOption> tenants) {
        super(message);
        this.status = status;
        this.code = code;
        this.tenants = tenants;
    }

    public static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    public static AuthException locked() {
        return new AuthException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                "Too many failed attempts. Your account is temporarily locked; try again later or reset your password.");
    }

    public static AuthException invalidMfa() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_MFA_CODE", "Invalid or expired verification code");
    }

    public static AuthException mfaSessionExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "MFA_SESSION_EXPIRED", "Your sign-in session expired. Please sign in again.");
    }

    public static AuthException invalidRefresh() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Session expired. Please sign in again.");
    }
}
