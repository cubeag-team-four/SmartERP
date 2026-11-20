package com.cubeage.erp.auth.service;

import com.cubeage.erp.admin.entity.User;

/**
 * Delivers a password-reset link to the account owner.
 *
 * <p><b>Deployment blocker:</b> SmartERP has no email provider integrated yet. Until one is
 * (SMTP / SES / SendGrid), provide a bean implementing this interface that sends {@code link}
 * to {@code user.getEmail()} and annotate it {@code @Primary} so it is used instead of
 * {@link LoggingPasswordResetNotifier}.
 */
public interface PasswordResetNotifier {

    void sendPasswordReset(User user, String link, java.time.Duration validFor);
}
