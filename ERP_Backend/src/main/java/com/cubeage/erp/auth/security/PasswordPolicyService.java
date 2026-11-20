package com.cubeage.erp.auth.security;

import com.cubeage.erp.auth.entity.PasswordHistory;
import com.cubeage.erp.auth.repository.PasswordHistoryRepository;
import com.cubeage.erp.common.exception.BadRequestException;
import com.cubeage.erp.settings.repository.SecuritySettingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Server-side password policy, applied on signup, admin-created users, password change and
 * password reset. The frontend shows the same rules, but this class is the authority.
 *
 * <ul>
 *   <li>Length: at least {@code max(10, tenant minimum)} and at most 128 characters.</li>
 *   <li>At least 3 of 4 character classes: upper, lower, digit, symbol.</li>
 *   <li>Not a common password, or a common word dressed up with digits/symbols.</li>
 *   <li>Does not contain the user's email name or name.</li>
 *   <li>Not one of the user's last N passwords (default 5).</li>
 *   <li>Not found in known breaches (HIBP k-anonymity, fail-open).</li>
 * </ul>
 */
@Service
public class PasswordPolicyService {

    public static final int ABSOLUTE_MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 128;

    private final PasswordHistoryRepository historyRepository;
    private final SecuritySettingRepository securitySettingRepository;
    private final PasswordEncoder passwordEncoder;
    private final BreachedPasswordChecker breachedPasswordChecker;
    private final int historySize;
    private final Set<String> commonPasswords;

    public PasswordPolicyService(PasswordHistoryRepository historyRepository,
                                 SecuritySettingRepository securitySettingRepository,
                                 PasswordEncoder passwordEncoder,
                                 BreachedPasswordChecker breachedPasswordChecker,
                                 @Value("${app.security.password.history-size:5}") int historySize) {
        this.historyRepository = historyRepository;
        this.securitySettingRepository = securitySettingRepository;
        this.passwordEncoder = passwordEncoder;
        this.breachedPasswordChecker = breachedPasswordChecker;
        this.historySize = historySize;
        this.commonPasswords = loadCommonPasswords();
    }

    /** Minimum length for a tenant (tenant setting can raise, never lower, the floor). */
    public int minimumLength(Long tenantId) {
        if (tenantId == null) return ABSOLUTE_MIN_LENGTH;
        return securitySettingRepository.findByTenantId(tenantId)
                .map(s -> Math.max(ABSOLUTE_MIN_LENGTH, s.getMinimumPasswordLength() == null ? 0 : s.getMinimumPasswordLength()))
                .orElse(ABSOLUTE_MIN_LENGTH);
    }

    /**
     * @param userId null for a brand-new account (no history check)
     * @throws BadRequestException listing every rule the password breaks
     */
    public void validate(String password, String email, String name, Long tenantId, Long userId) {
        List<String> problems = new ArrayList<>(staticViolations(password, email, name, minimumLength(tenantId)));
        if (problems.isEmpty() && userId != null && reusesRecentPassword(userId, password)) {
            problems.add("must not match any of your last " + historySize + " passwords");
        }
        if (problems.isEmpty() && breachedPasswordChecker.isBreached(password)) {
            problems.add("appears in a known data breach; choose a different password");
        }
        if (!problems.isEmpty()) {
            throw new BadRequestException("Password " + String.join("; ", problems));
        }
    }

    /** Rules that need no I/O (also used by unit tests). */
    List<String> staticViolations(String password, String email, String name, int minLength) {
        List<String> problems = new ArrayList<>();
        if (password == null || password.isEmpty()) {
            problems.add("is required");
            return problems;
        }
        if (password.length() < minLength) problems.add("must be at least " + minLength + " characters");
        if (password.length() > MAX_LENGTH) problems.add("must be at most " + MAX_LENGTH + " characters");
        int classes = 0;
        if (password.chars().anyMatch(Character::isUpperCase)) classes++;
        if (password.chars().anyMatch(Character::isLowerCase)) classes++;
        if (password.chars().anyMatch(Character::isDigit)) classes++;
        if (password.chars().anyMatch(c -> !Character.isLetterOrDigit(c))) classes++;
        if (classes < 3) problems.add("must contain at least 3 of: uppercase, lowercase, number, symbol");

        String lower = password.toLowerCase(Locale.ROOT);
        String lettersOnly = lower.replaceAll("[^a-z]", "");
        if (commonPasswords.contains(lower) || (lettersOnly.length() >= 4 && commonPasswords.contains(lettersOnly))) {
            problems.add("is too common");
        }
        for (String part : personalTokens(email, name)) {
            if (lower.contains(part)) {
                problems.add("must not contain your name or email");
                break;
            }
        }
        return problems;
    }

    public void recordInHistory(Long userId, String passwordHash) {
        historyRepository.save(PasswordHistory.builder().userId(userId).passwordHash(passwordHash).build());
    }

    private boolean reusesRecentPassword(Long userId, String password) {
        return historyRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, historySize)).stream()
                .anyMatch(h -> passwordEncoder.matches(password, h.getPasswordHash()));
    }

    private static Set<String> personalTokens(String email, String name) {
        Set<String> tokens = new HashSet<>();
        if (email != null && email.contains("@")) {
            String local = email.substring(0, email.indexOf('@')).toLowerCase(Locale.ROOT);
            tokens.add(local);
            tokens.addAll(Arrays.asList(local.split("[._+\\-]")));
        }
        if (name != null) {
            tokens.addAll(Arrays.asList(name.toLowerCase(Locale.ROOT).split("\\s+")));
        }
        tokens.removeIf(t -> t.length() < 3);
        return tokens;
    }

    private static Set<String> loadCommonPasswords() {
        Set<String> set = new HashSet<>();
        try (InputStream in = PasswordPolicyService.class.getResourceAsStream("/security/common-passwords.txt")) {
            if (in == null) throw new IllegalStateException("security/common-passwords.txt missing from classpath");
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                reader.lines().map(String::trim).filter(l -> !l.isEmpty() && !l.startsWith("#"))
                        .map(l -> l.toLowerCase(Locale.ROOT)).forEach(set::add);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read common-password list", e);
        }
        return Collections.unmodifiableSet(set);
    }
}
