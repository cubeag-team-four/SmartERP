package com.cubeage.erp.security.jwt;

import com.cubeage.erp.security.user.UserPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Issues and verifies two kinds of HS256 tokens, distinguished by the {@code typ} claim:
 *
 * <ul>
 *   <li><b>access</b> (15 min, SRS 8.7): carries user id, tenant id and the user's
 *       {@code token_version} ({@code tv}). The JWT filter rejects it once the stored version
 *       has moved on (logout, password change, deactivation, role change, MFA reset).</li>
 *   <li><b>mfa</b> (5 min): proves the password step succeeded and nothing else. It is only
 *       accepted by the MFA endpoints and is never a valid access token.</li>
 * </ul>
 */
@Service
public class JwtService {

    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_MFA = "mfa";
    public static final Duration MFA_TOKEN_TTL = Duration.ofMinutes(5);

    /** Previously committed fallback secret; anyone with the source could forge tokens with it. */
    private static final String KNOWN_PUBLIC_DEFAULT = "SmartERP-development-signing-key-change-in-production-2026";

    private final SecretKey signingKey;
    private final long expirationMillis;

    public JwtService(
            @Value("${app.security.jwt.secret:}") String secret,
            @Value("${app.security.jwt.expiration-ms:900000}") long expirationMillis) {
        this.signingKey = Keys.hmacShaKeyFor(validatedKeyBytes(secret));
        this.expirationMillis = expirationMillis;
    }

    /** Claims of a verified access token. */
    public record AccessClaims(long userId, long tenantId, int tokenVersion) { }

    /** Claims of a verified MFA-pending token. */
    public record MfaClaims(long userId, long tenantId, int tokenVersion, String purpose) { }

    /**
     * Fails startup unless a real signing secret is configured: no blank value, no publicly
     * known default, and at least 256 bits of key material (HS256 minimum). Short secrets are
     * rejected rather than stretched, because hashing a short secret adds no entropy.
     */
    static byte[] validatedKeyBytes(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not configured (app.security.jwt.secret)");
        }
        if (KNOWN_PUBLIC_DEFAULT.equals(secret)) {
            throw new IllegalStateException("JWT_SECRET is set to the publicly known default; generate a new one");
        }
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException notBase64) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 bytes of key material");
        }
        return keyBytes;
    }

    public long accessTokenTtlSeconds() {
        return expirationMillis / 1000;
    }

    public String issueAccessToken(UserPrincipal principal) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(principal.getId()))
                .claim("typ", TYPE_ACCESS)
                .claim("uid", principal.getId())
                .claim("tenantId", principal.getTenantId())
                .claim("tv", principal.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMillis)))
                .signWith(signingKey)
                .compact();
    }

    public String issueMfaToken(long userId, long tenantId, int tokenVersion, String purpose) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("typ", TYPE_MFA)
                .claim("uid", userId)
                .claim("tenantId", tenantId)
                .claim("tv", tokenVersion)
                .claim("purpose", purpose)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(MFA_TOKEN_TTL)))
                .signWith(signingKey)
                .compact();
    }

    /** Verifies signature, expiry and type; empty for anything else (including MFA tokens). */
    public Optional<AccessClaims> parseAccessToken(String token) {
        return parse(token, TYPE_ACCESS).map(c -> new AccessClaims(
                number(c, "uid"), number(c, "tenantId"), (int) number(c, "tv")));
    }

    public Optional<MfaClaims> parseMfaToken(String token) {
        return parse(token, TYPE_MFA).map(c -> new MfaClaims(
                number(c, "uid"), number(c, "tenantId"), (int) number(c, "tv"), c.get("purpose", String.class)));
    }

    private Optional<Claims> parse(String token, String expectedType) {
        if (token == null || token.isBlank()) return Optional.empty();
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
            if (!expectedType.equals(claims.get("typ", String.class))) return Optional.empty();
            if (!(claims.get("uid") instanceof Number) || !(claims.get("tenantId") instanceof Number)
                    || !(claims.get("tv") instanceof Number)) {
                return Optional.empty();   // pre-hardening tokens lack tv and are rejected
            }
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private static long number(Claims claims, String name) {
        return ((Number) claims.get(name)).longValue();
    }
}
