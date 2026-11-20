package com.cubeage.erp.auth.security;

import com.cubeage.erp.auth.entity.PasswordHistory;
import com.cubeage.erp.auth.repository.PasswordHistoryRepository;
import com.cubeage.erp.common.exception.BadRequestException;
import com.cubeage.erp.settings.entity.SecuritySetting;
import com.cubeage.erp.settings.repository.SecuritySettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PasswordPolicyServiceTest {

    private static final String STRONG = "Granite!Harbor42";

    private PasswordHistoryRepository history;
    private SecuritySettingRepository settings;
    private BreachedPasswordChecker breached;
    private BCryptPasswordEncoder encoder;
    private PasswordPolicyService policy;

    @BeforeEach
    void setUp() {
        history = mock(PasswordHistoryRepository.class);
        settings = mock(SecuritySettingRepository.class);
        breached = mock(BreachedPasswordChecker.class);
        encoder = new BCryptPasswordEncoder(4);
        when(settings.findByTenantId(any())).thenReturn(Optional.empty());
        when(history.findByUserIdOrderByCreatedAtDesc(anyLong(), any())).thenReturn(List.of());
        policy = new PasswordPolicyService(history, settings, encoder, breached, 5);
    }

    private void assertRejected(String password, String expectedFragment) {
        BadRequestException e = assertThrows(BadRequestException.class,
                () -> policy.validate(password, "priya.sharma@acme.in", "Priya Sharma", 1L, null));
        assertTrue(e.getMessage().contains(expectedFragment), e.getMessage());
    }

    @Test
    void acceptsAStrongPassword() {
        assertDoesNotThrow(() -> policy.validate(STRONG, "priya.sharma@acme.in", "Priya Sharma", 1L, 9L));
    }

    @Test
    void enforcesMinimumLengthOfTen() {
        assertRejected("Ab1!xyzq", "at least 10 characters");
    }

    @Test
    void requiresThreeCharacterClasses() {
        assertRejected("lowercaseonlyhere", "at least 3 of");
        assertRejected("lowercaseand12345", "at least 3 of");
        assertDoesNotThrow(() -> policy.validate("lowercase12345UPPER", "x@y.com", "X", 1L, null));
    }

    @Test
    void rejectsCommonPasswordsEvenWithDecoration() {
        assertRejected("Password@2026", "too common");
        assertRejected("Welcome#12345", "too common");
        assertRejected("Smarterp!2026", "too common");
    }

    @Test
    void rejectsPasswordsContainingNameOrEmail() {
        assertRejected("Priya!Secure2026", "name or email");
        assertRejected("xSharma#998877", "name or email");
    }

    @Test
    void rejectsOverlyLongPasswords() {
        assertRejected("Aa1!" + "x".repeat(130), "at most 128");
    }

    @Test
    void tenantSettingCanRaiseButNotLowerTheMinimum() {
        SecuritySetting strict = SecuritySetting.builder().minimumPasswordLength(14).build();
        SecuritySetting lax = SecuritySetting.builder().minimumPasswordLength(6).build();
        when(settings.findByTenantId(1L)).thenReturn(Optional.of(strict));
        when(settings.findByTenantId(2L)).thenReturn(Optional.of(lax));
        assertEquals(14, policy.minimumLength(1L));
        assertEquals(10, policy.minimumLength(2L));
    }

    @Test
    void blocksReuseOfRecentPasswords() {
        when(history.findByUserIdOrderByCreatedAtDesc(eq(9L), any()))
                .thenReturn(List.of(PasswordHistory.builder().passwordHash(encoder.encode(STRONG)).build()));
        BadRequestException e = assertThrows(BadRequestException.class,
                () -> policy.validate(STRONG, "a@b.com", "A B", 1L, 9L));
        assertTrue(e.getMessage().contains("last 5 passwords"));
    }

    @Test
    void rejectsBreachedPasswords() {
        when(breached.isBreached(STRONG)).thenReturn(true);
        assertRejected(STRONG, "known data breach");
    }

    @Test
    void breachCheckerIsFailOpenWhenServiceUnreachable() {
        BreachedPasswordChecker unreachable = new BreachedPasswordChecker(true, "http://127.0.0.1:1/range/");
        assertFalse(unreachable.isBreached(STRONG));
        assertFalse(new BreachedPasswordChecker(false, "http://unused/").isBreached("anything"));
    }
}
