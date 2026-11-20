package com.cubeage.erp.auth.service;

import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.admin.repository.RoleRepository;
import com.cubeage.erp.admin.repository.UserRepository;
import com.cubeage.erp.auth.dto.SignupRequest;
import com.cubeage.erp.auth.dto.SignupResponse;
import com.cubeage.erp.auth.exception.AuthException;
import com.cubeage.erp.auth.security.PasswordPolicyService;
import com.cubeage.erp.auth.security.TokenHasher;
import com.cubeage.erp.security.Roles;
import com.cubeage.erp.tenant.entity.Tenant;
import com.cubeage.erp.tenant.enums.TenantPlan;
import com.cubeage.erp.tenant.enums.TenantStatus;
import com.cubeage.erp.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Self-service company registration (SRS 2.6 "customers self-onboard"; Module 1).
 *
 * <p>Creates, in one transaction: a TRIAL company, its seven company-level system roles
 * (Admin, Finance, Sales, HR Manager, Operations, Inventory, Employee — Super Admin is
 * platform-level and never created here), and the signing-up person as its Admin.
 * The Admin must enroll MFA at first sign-in (mandatory for TENANT_ADMIN).
 *
 * <p>The email must not already be registered in any company, so a newly registered account
 * never makes login ambiguous.
 */
@Service
@RequiredArgsConstructor
public class SignupService {

    private final TenantRepository tenantRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyService passwordPolicy;
    private final SecurityAuditService audit;

    @Transactional
    public SignupResponse signup(SignupRequest request, ClientInfo client) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String name = request.name().trim();
        String companyName = request.companyName().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            audit.record(null, null, "SIGNUP", "FAILURE", null, null, "Email already registered", client);
            throw new AuthException(HttpStatus.CONFLICT, "EMAIL_IN_USE",
                    "An account with this email already exists. Sign in or reset your password instead.");
        }
        passwordPolicy.validate(request.password(), email, name, null, null);

        Tenant tenant = tenantRepository.save(Tenant.builder()
                .code(uniqueTenantCode(companyName))
                .name(companyName)
                .contactEmail(email)
                .contactPhone(request.phone())
                .status(TenantStatus.TRIAL)
                .plan(TenantPlan.STARTER)
                .maxUsers(10)
                .currency("INR")
                .timezone("Asia/Kolkata")
                .trialEndsAt(Instant.now().plus(14, ChronoUnit.DAYS))
                .build());

        Map<String, Role> roles = new HashMap<>();
        for (String roleName : Roles.TENANT_SYSTEM_ROLES) {
            roles.put(roleName, roleRepository.save(Role.builder()
                    .tenantId(tenant.getId()).name(roleName).systemRole(true).build()));
        }

        User admin = userRepository.save(User.builder()
                .tenantId(tenant.getId())
                .name(name)
                .email(email)
                .position("Administrator")
                .passwordHash(passwordEncoder.encode(request.password()))
                .passwordChangedAt(Instant.now())
                .active(true)
                .roles(new java.util.HashSet<>(Set.of(roles.get(Roles.TENANT_ADMIN))))
                .build());

        audit.record(tenant.getId(), admin.getId(), "SIGNUP", "SUCCESS", "TENANT", tenant.getId(),
                "Company registered; admin user created", client);
        return new SignupResponse(tenant.getCode(), tenant.getName(), email);
    }

    /** Lower-case slug of the company name plus a random suffix, e.g. "acme-traders-7k3q". */
    String uniqueTenantCode(String companyName) {
        String slug = Normalizer.normalize(companyName, Normalizer.Form.NFKD)
                .replaceAll("[^A-Za-z0-9]+", "-").replaceAll("(^-|-$)", "").toLowerCase(Locale.ROOT);
        if (slug.length() > 40) slug = slug.substring(0, 40).replaceAll("-$", "");
        if (slug.length() < 2) slug = "company";
        for (int attempt = 0; attempt < 10; attempt++) {
            String code = slug + "-" + TokenHasher.randomToken(3).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "x");
            if (!tenantRepository.existsByCodeIgnoreCase(code)) return code;
        }
        throw new IllegalStateException("Could not allocate a unique company code");
    }
}
