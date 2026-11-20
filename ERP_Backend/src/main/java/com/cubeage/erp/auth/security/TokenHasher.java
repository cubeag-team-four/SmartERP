package com.cubeage.erp.auth.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Hashing and generation for high-entropy secrets (refresh tokens, reset tokens, recovery
 * codes). These values are random with 128+ bits of entropy, so a fast unsalted SHA-256 is
 * the right at-rest protection; a slow password hash is only needed for human passwords.
 */
public final class TokenHasher {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private TokenHasher() { }

    public static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }

    /** URL-safe random token with {@code bytes * 8} bits of entropy. */
    public static String randomToken(int bytes) {
        byte[] buffer = new byte[bytes];
        RANDOM.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }

    /** Recovery code formatted XXXXX-XXXXX (10 symbols from a 32-char alphabet = 50 bits). */
    public static String recoveryCode() {
        StringBuilder sb = new StringBuilder(11);
        for (int i = 0; i < 10; i++) {
            if (i == 5) sb.append('-');
            sb.append(RECOVERY_ALPHABET[RANDOM.nextInt(RECOVERY_ALPHABET.length)]);
        }
        return sb.toString();
    }

    /** Canonical form used before hashing a user-typed recovery code. */
    public static String normalizeRecoveryCode(String code) {
        return code == null ? "" : code.replaceAll("[\\s-]", "").toUpperCase();
    }
}
