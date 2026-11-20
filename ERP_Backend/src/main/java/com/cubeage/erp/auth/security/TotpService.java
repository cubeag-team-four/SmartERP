package com.cubeage.erp.auth.security;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.OptionalLong;

/**
 * RFC 6238 TOTP (HMAC-SHA1, 30-second steps, 6 digits): the defaults used by Google
 * Authenticator, Microsoft Authenticator and other RFC-compatible apps.
 */
@Service
public class TotpService {

    public static final int DIGITS = 6;
    public static final int PERIOD_SECONDS = 30;
    /** Accept one step either side (±30 s) for clock skew. */
    public static final int ALLOWED_SKEW_STEPS = 1;

    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Clock clock;

    public TotpService() {
        this(Clock.systemUTC());
    }

    TotpService(Clock clock) {
        this.clock = clock;
    }

    /** New 160-bit secret, base32-encoded (RFC 4226 recommends at least 128 bits). */
    public String generateSecret() {
        byte[] bytes = new byte[20];
        RANDOM.nextBytes(bytes);
        return base32Encode(bytes);
    }

    public String otpAuthUri(String issuer, String accountName, String base32Secret) {
        String label = enc(issuer) + ":" + enc(accountName);
        return "otpauth://totp/" + label + "?secret=" + base32Secret + "&issuer=" + enc(issuer)
                + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + PERIOD_SECONDS;
    }

    /**
     * Verifies a code and returns the matching time step, which the caller must persist and
     * pass back as {@code lastUsedStep} so the same code cannot be replayed.
     */
    public OptionalLong verify(String base32Secret, String code, Long lastUsedStep) {
        if (base32Secret == null || code == null) return OptionalLong.empty();
        String digits = code.replaceAll("\\s", "");
        if (!digits.matches("\\d{" + DIGITS + "}")) return OptionalLong.empty();
        byte[] key = base32Decode(base32Secret);
        long current = clock.instant().getEpochSecond() / PERIOD_SECONDS;
        for (long step = current - ALLOWED_SKEW_STEPS; step <= current + ALLOWED_SKEW_STEPS; step++) {
            if (lastUsedStep != null && step <= lastUsedStep) continue;
            String expected = codeAt(key, step);
            if (MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), digits.getBytes(StandardCharsets.US_ASCII))) {
                return OptionalLong.of(step);
            }
        }
        return OptionalLong.empty();
    }

    /** RFC 4226 HOTP value for a given counter (exposed for RFC test vectors). */
    static String codeAt(byte[] key, long counter) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(counter).array());
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
            int otp = binary % (int) Math.pow(10, DIGITS);
            return String.format("%0" + DIGITS + "d", otp);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA1 unavailable", e);
        }
    }

    static String base32Encode(byte[] data) {
        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0, bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32.charAt((buffer >> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return out.toString();
    }

    static byte[] base32Decode(String encoded) {
        String s = encoded.replaceAll("[\\s=]", "").toUpperCase();
        ByteBuffer out = ByteBuffer.allocate(s.length() * 5 / 8);
        int buffer = 0, bits = 0;
        for (char c : s.toCharArray()) {
            int val = BASE32.indexOf(c);
            if (val < 0) throw new IllegalArgumentException("Invalid base32 character");
            buffer = (buffer << 5) | val;
            bits += 5;
            if (bits >= 8) {
                out.put((byte) ((buffer >> (bits - 8)) & 0xff));
                bits -= 8;
            }
        }
        return java.util.Arrays.copyOf(out.array(), out.position());
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
