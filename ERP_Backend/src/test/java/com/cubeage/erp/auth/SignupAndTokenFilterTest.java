package com.cubeage.erp.auth;

import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.admin.repository.RoleRepository;
import com.cubeage.erp.auth.dto.SignupRequest;
import com.cubeage.erp.auth.dto.SignupResponse;
import com.cubeage.erp.auth.exception.AuthException;
import com.cubeage.erp.auth.service.ClientInfo;
import com.cubeage.erp.auth.service.SignupService;
import com.cubeage.erp.security.Roles;
import com.cubeage.erp.security.jwt.JwtAuthenticationFilter;
import com.cubeage.erp.security.user.CustomUserDetailsService;
import com.cubeage.erp.security.user.UserPrincipal;
import com.cubeage.erp.tenant.entity.Tenant;
import com.cubeage.erp.tenant.enums.TenantStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SignupAndTokenFilterTest {

    private static final ClientInfo CLIENT = new ClientInfo("203.0.113.7", "JUnit");

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    // ------------------------------------------------------------------------- signup

    private record SignupHarness(AuthFixture f, SignupService service, List<Role> roles) { }

    private SignupHarness signupHarness() {
        AuthFixture f = new AuthFixture();
        List<Role> roles = new ArrayList<>();
        RoleRepository roleRepository = mock(RoleRepository.class);
        when(roleRepository.save(any())).thenAnswer(inv -> {
            Role r = inv.getArgument(0);
            r.setId(f.ids.incrementAndGet());
            roles.add(r);
            return r;
        });
        when(f.tenantRepository.save(any())).thenAnswer(inv -> {
            Tenant t = inv.getArgument(0);
            t.setId(f.ids.incrementAndGet());
            f.tenants.put(t.getId(), t);
            return t;
        });
        when(f.userRepository.existsByEmailIgnoreCase(anyString())).thenAnswer(inv ->
                f.users.values().stream().anyMatch(u -> u.getEmail().equalsIgnoreCase(inv.getArgument(0))));
        SignupService service = new SignupService(f.tenantRepository, roleRepository, f.userRepository, f.encoder,
                f.passwordPolicy, f.audit);
        return new SignupHarness(f, service, roles);
    }

    @Test
    void signupCreatesTrialCompanySystemRolesAndAnAdminWhoMustEnrollMfa() {
        SignupHarness h = signupHarness();
        SignupResponse response = h.service().signup(
                new SignupRequest("Priya Sharma", "Acme Traders Pvt. Ltd.", "Priya@Acme.in", AuthFixture.PASSWORD, null), CLIENT);

        assertTrue(response.tenantCode().matches("acme-traders-pvt-ltd-[a-z0-9]{4}"), response.tenantCode());
        Tenant tenant = h.f().tenants.values().iterator().next();
        assertEquals(TenantStatus.TRIAL, tenant.getStatus());

        List<String> roleNames = h.roles().stream().map(Role::getName).toList();
        assertEquals(Roles.TENANT_SYSTEM_ROLES, roleNames);
        assertFalse(roleNames.contains(Roles.SUPER_ADMIN), "platform role is never created by a tenant signup");
        assertTrue(h.roles().stream().allMatch(Role::getSystemRole));

        User admin = h.f().users.values().iterator().next();
        assertEquals("priya@acme.in", admin.getEmail());
        assertNotEquals(AuthFixture.PASSWORD, admin.getPasswordHash());
        assertTrue(h.f().encoder.matches(AuthFixture.PASSWORD, admin.getPasswordHash()));
        assertEquals(List.of(Roles.TENANT_ADMIN), admin.getRoles().stream().map(Role::getName).toList());
        verify(h.f().passwordPolicy).validate(eq(AuthFixture.PASSWORD), eq("priya@acme.in"), eq("Priya Sharma"), isNull(), isNull());
        assertEquals(1, h.f().auditCount("SIGNUP", "SUCCESS"));

        // First sign-in must go through MFA enrollment (TENANT_ADMIN).
        var login = h.f().auth.login(new com.cubeage.erp.auth.dto.LoginRequest("priya@acme.in", AuthFixture.PASSWORD, null), CLIENT);
        assertEquals("MFA_ENROLLMENT_REQUIRED", login.body().status());
    }

    @Test
    void signupRejectsAnEmailAlreadyRegisteredAnywhere() {
        SignupHarness h = signupHarness();
        h.f().user(h.f().tenant("other", TenantStatus.ACTIVE), "taken@x.in", "EMPLOYEE");
        AuthException e = assertThrows(AuthException.class, () -> h.service().signup(
                new SignupRequest("A B", "New Co", "TAKEN@x.in", AuthFixture.PASSWORD, null), CLIENT));
        assertEquals("EMAIL_IN_USE", e.getCode());
        assertTrue(h.roles().isEmpty());
    }

    // ------------------------------------------------------------------- JWT filter

    private boolean authenticates(AuthFixture f, User user, String token) throws Exception {
        CustomUserDetailsService uds = mock(CustomUserDetailsService.class);
        when(uds.loadById(user.getId())).thenAnswer(inv -> UserPrincipal.from(user));
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(f.jwtService, uds);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/hr/employees");
        request.addHeader("Authorization", "Bearer " + token);
        SecurityContextHolder.clearContext();
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        return SecurityContextHolder.getContext().getAuthentication() != null;
    }

    @Test
    void filterAcceptsCurrentAccessTokensOnly() throws Exception {
        AuthFixture f = new AuthFixture();
        User u = f.user(f.tenant("acme", TenantStatus.ACTIVE), "emp@acme.in", "EMPLOYEE");
        String access = f.jwtService.issueAccessToken(UserPrincipal.from(u));
        assertTrue(authenticates(f, u, access));

        String mfaToken = f.jwtService.issueMfaToken(u.getId(), u.getTenantId(), u.getTokenVersion(), "VERIFY");
        assertFalse(authenticates(f, u, mfaToken), "MFA-pending token is not an access token");

        assertFalse(authenticates(f, u, access.substring(0, access.length() - 2) + "xx"), "tampered signature");

        u.bumpTokenVersion();   // logout / password change / role change
        assertFalse(authenticates(f, u, access), "stale token version");
    }

    @Test
    void filterRejectsATokenWhoseTenantNoLongerMatchesTheUser() throws Exception {
        AuthFixture f = new AuthFixture();
        User u = f.user(f.tenant("acme", TenantStatus.ACTIVE), "emp@acme.in", "EMPLOYEE");
        String access = f.jwtService.issueAccessToken(UserPrincipal.from(u));
        u.setTenantId(u.getTenantId() + 1);
        assertFalse(authenticates(f, u, access));
    }
}
