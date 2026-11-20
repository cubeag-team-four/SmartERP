package com.cubeage.erp.auth.security;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.OptionalLong;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/** TOTP, AES-GCM secret storage, token hashing and the rate limiter. */
class AuthPrimitivesTest {

    // RFC 6238 Appendix B, SHA-1 seed "12345678901234567890" (8-digit values truncated to 6).
    private static final byte[] RFC_SEED = "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    @Test
    void totpMatchesRfc6238TestVectors() {
        assertEquals("287082", TotpService.codeAt(RFC_SEED, 59L / 30));
        assertEquals("081804", TotpService.codeAt(RFC_SEED, 1111111109L / 30));
        assertEquals("005924", TotpService.codeAt(RFC_SEED, 1234567890L / 30));
        assertEquals("279037", TotpService.codeAt(RFC_SEED, 2000000000L / 30));
    }

    @Test
    void totpVerifiesCurrentCodeAllowsOneStepSkewAndRejectsReplay() {
        String secret = TotpService.base32Encode(RFC_SEED);
        TotpService totp = new TotpService(Clock.fixed(Instant.ofEpochSecond(1111111109L), ZoneOffset.UTC));
        long step = 1111111109L / 30;

        OptionalLong ok = totp.verify(secret, "081804", null);
        assertEquals(step, ok.orElseThrow());
        assertTrue(totp.verify(secret, TotpService.codeAt(RFC_SEED, step - 1), null).isPresent(), "previous step allowed");
        assertTrue(totp.verify(secret, TotpService.codeAt(RFC_SEED, step + 1), null).isPresent(), "next step allowed");
        assertTrue(totp.verify(secret, TotpService.codeAt(RFC_SEED, step + 2), null).isEmpty(), "two steps ahead rejected");

        assertTrue(totp.verify(secret, "081804", step).isEmpty(), "same code cannot be replayed");
        assertTrue(totp.verify(secret, "000000", null).isEmpty());
        assertTrue(totp.verify(secret, "12345", null).isEmpty());
        assertTrue(totp.verify(secret, "abcdef", null).isEmpty());
    }

    @Test
    void base32RoundTripsAndSecretsAre160Bits() {
        TotpService totp = new TotpService();
        String secret = totp.generateSecret();
        assertEquals(20, TotpService.base32Decode(secret).length);
        assertArrayEquals(RFC_SEED, TotpService.base32Decode(TotpService.base32Encode(RFC_SEED)));
        assertTrue(totp.otpAuthUri("SmartERP", "a@b.com", secret).startsWith("otpauth://totp/SmartERP:a%40b.com?secret=" + secret));
    }

    @Test
    void secretCipherRoundTripsAndDetectsTamperingAndWrongKey() {
        String key = Base64.getEncoder().encodeToString(new byte[32]);
        SecretCipher cipher = new SecretCipher(key);
        String stored = cipher.encrypt("JBSWY3DPEHPK3PXP");
        assertNotEquals("JBSWY3DPEHPK3PXP", stored);
        assertFalse(stored.contains("JBSWY3DPEHPK3PXP"));
        assertEquals("JBSWY3DPEHPK3PXP", cipher.decrypt(stored));
        assertNotEquals(stored, cipher.encrypt("JBSWY3DPEHPK3PXP"), "random IV per encryption");

        char[] chars = stored.toCharArray();
        chars[chars.length - 3] = chars[chars.length - 3] == 'A' ? 'B' : 'A';
        assertThrows(IllegalStateException.class, () -> cipher.decrypt(new String(chars)));

        byte[] otherKey = new byte[32];
        otherKey[0] = 1;
        assertThrows(IllegalStateException.class, () -> new SecretCipher(Base64.getEncoder().encodeToString(otherKey)).decrypt(stored));
    }

    @Test
    void secretCipherRequiresA256BitKey() {
        assertThrows(IllegalStateException.class, () -> new SecretCipher(""));
        assertThrows(IllegalStateException.class, () -> new SecretCipher(Base64.getEncoder().encodeToString(new byte[16])));
        assertThrows(IllegalStateException.class, () -> new SecretCipher("not base64 !!"));
    }

    @Test
    void tokenHasherProducesStableHashesAndHighEntropyValues() {
        assertEquals(TokenHasher.sha256Hex("abc"), TokenHasher.sha256Hex("abc"));
        assertEquals(64, TokenHasher.sha256Hex("abc").length());
        assertNotEquals(TokenHasher.randomToken(32), TokenHasher.randomToken(32));
        assertTrue(TokenHasher.recoveryCode().matches("[A-Z2-9]{5}-[A-Z2-9]{5}"));
        assertEquals("ABCDE12345", TokenHasher.normalizeRecoveryCode(" abcde-12345 "));
    }

    @Test
    void rateLimiterBlocksAfterLimitAndResetsAfterWindow() {
        AtomicLong now = new AtomicLong(1_000_000);
        Clock clock = new Clock() {
            public ZoneOffset getZone() { return ZoneOffset.UTC; }
            public Clock withZone(java.time.ZoneId zone) { return this; }
            public Instant instant() { return Instant.ofEpochMilli(now.get()); }
        };
        RateLimiter limiter = new RateLimiter(clock);
        for (int i = 0; i < 3; i++) assertTrue(limiter.tryAcquire("k", 3, Duration.ofMinutes(1)));
        assertFalse(limiter.tryAcquire("k", 3, Duration.ofMinutes(1)));
        assertTrue(limiter.tryAcquire("other", 3, Duration.ofMinutes(1)), "keys are independent");
        now.addAndGet(Duration.ofMinutes(1).toMillis());
        assertTrue(limiter.tryAcquire("k", 3, Duration.ofMinutes(1)), "new window");
    }
}
