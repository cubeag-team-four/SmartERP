package com.cubeage.erp.auth.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Have I Been Pwned "Pwned Passwords" k-anonymity check (SRS 12.4).
 *
 * <p>Only the first 5 hex characters of SHA-1(password) leave the server; the full password
 * and full hash never do. {@code Add-Padding} hides the true result size.
 *
 * <p><b>Failure policy: fail-open.</b> If the service is slow or unreachable the password is
 * accepted (the local policy and common-password list still apply) and a warning is logged.
 * Fail-closed would make signup and password reset depend on a third party's availability.
 */
@Slf4j
@Component
public class BreachedPasswordChecker {

    private final boolean enabled;
    private final String rangeUrl;
    private final HttpClient http;

    public BreachedPasswordChecker(
            @Value("${app.security.password.breach-check.enabled:true}") boolean enabled,
            @Value("${app.security.password.breach-check.url:https://api.pwnedpasswords.com/range/}") String rangeUrl) {
        this.enabled = enabled;
        this.rangeUrl = rangeUrl;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    }

    /** @return true only when the password is positively known to be breached. */
    public boolean isBreached(String password) {
        if (!enabled || password == null) return false;
        try {
            String sha1 = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1")
                    .digest(password.getBytes(StandardCharsets.UTF_8))).toUpperCase(Locale.ROOT);
            String prefix = sha1.substring(0, 5);
            String suffix = sha1.substring(5);
            HttpRequest request = HttpRequest.newBuilder(URI.create(rangeUrl + prefix))
                    .timeout(Duration.ofSeconds(3))
                    .header("Add-Padding", "true")
                    .header("User-Agent", "SmartERP-password-policy")
                    .GET().build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Breached-password check unavailable (HTTP {}); accepting password per fail-open policy", response.statusCode());
                return false;
            }
            for (String line : response.body().split("\r?\n")) {
                int colon = line.indexOf(':');
                if (colon > 0 && line.substring(0, colon).equalsIgnoreCase(suffix)) {
                    String count = line.substring(colon + 1).trim();
                    return !count.equals("0");   // padding rows have count 0
                }
            }
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.warn("Breached-password check failed ({}); accepting password per fail-open policy", e.getClass().getSimpleName());
            return false;
        }
    }
}
