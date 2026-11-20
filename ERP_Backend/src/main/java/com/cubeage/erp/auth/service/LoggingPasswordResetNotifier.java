package com.cubeage.erp.auth.service;

import com.cubeage.erp.admin.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Placeholder used until a real email sender exists (see {@link PasswordResetNotifier}).
 *
 * <p>By default it logs only that a reset was requested, never the link, because the link is a
 * bearer credential. For local development only, {@code app.security.password-reset.log-links=true}
 * (env {@code PASSWORD_RESET_LOG_LINKS}) prints the link so the flow can be tested end to end.
 * Never enable that flag in a shared or production environment.
 */
@Slf4j
@Component
public class LoggingPasswordResetNotifier implements PasswordResetNotifier {

    private final boolean logLinks;

    public LoggingPasswordResetNotifier(@Value("${app.security.password-reset.log-links:false}") boolean logLinks) {
        this.logLinks = logLinks;
        if (logLinks) {
            log.warn("PASSWORD_RESET_LOG_LINKS is enabled: reset links are written to the log. Development only!");
        }
    }

    @Override
    public void sendPasswordReset(User user, String link, Duration validFor) {
        if (logLinks) {
            log.warn("[DEV ONLY] Password reset link for user {}: {}", user.getId(), link);
        } else {
            log.info("Password reset requested for user {} but no email provider is configured; link not delivered", user.getId());
        }
    }
}
