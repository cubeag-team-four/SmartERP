package com.cubeage.erp.security;

import com.cubeage.erp.auth.security.TotpService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Full-stack security test: real Spring context, security filter chain, controllers, services
 * and JPA, over an in-memory H2 database in PostgreSQL mode (schema generated from entities).
 * Covers signup, mandatory admin MFA, cookie refresh rotation and reuse detection, logout,
 * RBAC, cross-tenant isolation, privilege escalation, password policy, lockout, rate limiting
 * and audit logging.
 */
@SpringBootTest(properties = {
        "spring.config.import=",
        "spring.datasource.url=jdbc:h2:mem:smarterp_sec;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR,VALUE,MONTH,DAY",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false",
        "app.security.jwt.secret=MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3",
        "app.security.mfa.encryption-key=MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=",
        "app.security.password.breach-check.enabled=false",
        "app.security.refresh-cookie.secure=true"
})
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SecurityIntegrationTest {

    private static final String PASSWORD = "Granite!Harbor42";
    private static final AtomicInteger IPS = new AtomicInteger(1);

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    // State shared across the ordered steps.
    private static String adminA;           // access token, company A admin
    private static long tenantA;
    private static long tenantB;
    private static String adminBToken;

    /** Each logical client gets its own IP so the per-IP rate limiter does not interfere. */
    private static RequestPostProcessor ip(String address) {
        return request -> { request.setRemoteAddr(address); return request; };
    }

    private static String freshIp() {
        return "10.0.0." + IPS.incrementAndGet();
    }

    private MockHttpServletResponse call(MockHttpServletRequestBuilder req, Object body, String token, String clientIp) throws Exception {
        req.with(ip(clientIp)).contentType(MediaType.APPLICATION_JSON);
        if (body != null) req.content(json.writeValueAsString(body));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req).andReturn().getResponse();
    }

    private JsonNode data(MockHttpServletResponse r) throws Exception {
        JsonNode root = json.readTree(r.getContentAsString());
        return root.has("data") ? root.get("data") : root;
    }

    private static String code(String base32Secret, long stepOffset) {
        byte[] key = (byte[]) ReflectionTestUtils.invokeMethod(TotpService.class, "base32Decode", base32Secret);
        return (String) ReflectionTestUtils.invokeMethod(TotpService.class, "codeAt", key, Instant.now().getEpochSecond() / 30 + stepOffset);
    }

    private static Cookie refreshCookie(MockHttpServletResponse r) {
        return r.getCookie("smarterp_rt");
    }

    /** Signs up a company and completes the mandatory admin MFA enrollment; returns the login body. */
    private JsonNode signupAndEnroll(String company, String email, String clientIp) throws Exception {
        var signup = call(post("/api/v1/auth/signup"),
                java.util.Map.of("name", "Admin Person", "companyName", company, "email", email, "password", PASSWORD), null, clientIp);
        assertEquals(201, signup.getStatus(), signup.getContentAsString());

        var login = call(post("/api/v1/auth/login"), java.util.Map.of("email", email, "password", PASSWORD), null, clientIp);
        assertEquals(200, login.getStatus());
        JsonNode step = data(login);
        assertEquals("MFA_ENROLLMENT_REQUIRED", step.get("status").asText(), "admins cannot skip MFA");
        assertFalse(step.has("accessToken"));
        assertNull(refreshCookie(login), "no session before MFA");
        String mfaToken = step.get("mfaToken").asText();

        // The MFA-pending token is not an access token.
        assertEquals(401, call(get("/api/v1/auth/me"), null, mfaToken, clientIp).getStatus());

        JsonNode setup = data(call(post("/api/v1/auth/mfa/setup"), java.util.Map.of("mfaToken", mfaToken), null, clientIp));
        String secret = setup.get("secret").asText();
        assertTrue(setup.get("otpauthUri").asText().startsWith("otpauth://totp/"));

        var bad = call(post("/api/v1/auth/mfa/enable"), java.util.Map.of("mfaToken", mfaToken, "code", "000000"), null, clientIp);
        assertEquals(401, bad.getStatus());

        var enabled = call(post("/api/v1/auth/mfa/enable"), java.util.Map.of("mfaToken", mfaToken, "code", code(secret, 0)), null, clientIp);
        assertEquals(200, enabled.getStatus(), enabled.getContentAsString());
        JsonNode body = data(enabled);
        assertEquals("AUTHENTICATED", body.get("status").asText());
        assertEquals(8, body.get("recoveryCodes").size());
        assertFalse(body.has("refreshToken"), "refresh token never in the body");
        Cookie rt = refreshCookie(enabled);
        assertNotNull(rt);
        assertTrue(rt.isHttpOnly());
        assertTrue(rt.getSecure());
        assertEquals("/api/v1/auth", rt.getPath());
        assertTrue(enabled.getHeader("Set-Cookie").contains("SameSite=Strict"));
        return body;
    }

    @Test
    @Order(1)
    void signupThenMandatoryMfaEnrollmentForAdmins() throws Exception {
        JsonNode a = signupAndEnroll("Alpha Industries", "admin@alpha.test", freshIp());
        adminA = a.get("accessToken").asText();
        tenantA = a.get("tenantId").asLong();
        assertEquals("TENANT_ADMIN", a.get("role").asText());

        JsonNode b = signupAndEnroll("Beta Traders", "admin@beta.test", freshIp());
        adminBToken = b.get("accessToken").asText();
        tenantB = b.get("tenantId").asLong();
        assertNotEquals(tenantA, tenantB);

        JsonNode me = data(call(get("/api/v1/auth/me"), null, adminA, freshIp()));
        assertTrue(me.get("mfaEnabled").asBoolean());
        assertTrue(me.get("mfaRequired").asBoolean());
    }

    @Test
    @Order(2)
    void signupRejectsWeakPasswordsAndDuplicateEmails() throws Exception {
        String clientIp = freshIp();
        var weak = call(post("/api/v1/auth/signup"),
                java.util.Map.of("name", "X Y", "companyName", "Weak Co", "email", "x@weak.test", "password", "password123"), null, clientIp);
        assertEquals(400, weak.getStatus());
        assertTrue(weak.getContentAsString().contains("Password"), weak.getContentAsString());

        var dup = call(post("/api/v1/auth/signup"),
                java.util.Map.of("name", "X Y", "companyName", "Dup Co", "email", "ADMIN@alpha.test", "password", PASSWORD), null, clientIp);
        assertEquals(409, dup.getStatus());
    }

    @Test
    @Order(3)
    void adminCannotReachAnotherCompanyOrEscalateToSuperAdmin() throws Exception {
        String clientIp = freshIp();
        assertEquals(200, call(get("/api/v1/admin/roles"), null, adminA, clientIp).getStatus());
        assertEquals(403, call(get("/api/v1/admin/roles").param("tenantId", String.valueOf(tenantB)), null, adminA, clientIp).getStatus(),
                "tenantId parameter cannot switch company");

        var superRole = call(post("/api/v1/admin/roles"), java.util.Map.of("name", "Super Admin"), null, clientIp);
        assertEquals(401, superRole.getStatus());
        var mint = call(post("/api/v1/admin/roles"), java.util.Map.of("name", "SUPER_ADMIN"), adminA, clientIp);
        assertEquals(403, mint.getStatus(), "tenant admins cannot mint the platform role");
        var mintOther = call(post("/api/v1/admin/roles"), java.util.Map.of("name", "Auditor", "tenantId", tenantB), adminA, clientIp);
        assertEquals(403, mintOther.getStatus(), "cannot create roles in another company");

        assertEquals(403, call(get("/api/v1/tenants"), null, adminA, clientIp).getStatus(), "platform endpoints need SUPER_ADMIN");
    }

    @Test
    @Order(4)
    void employeesAreLimitedByRoleAndPasswordPolicyAppliesToAdminCreatedUsers() throws Exception {
        String clientIp = freshIp();
        JsonNode roles = data(call(get("/api/v1/admin/roles"), null, adminA, clientIp));
        long employeeRoleId = -1;
        for (JsonNode r : roles) if (r.get("name").asText().equals("EMPLOYEE")) employeeRoleId = r.get("id").asLong();
        assertTrue(employeeRoleId > 0);

        var weak = call(post("/api/v1/admin/users"), java.util.Map.of("name", "Eve Employee", "email", "eve@alpha.test",
                "position", "Clerk", "password", "clerkpassword", "roleId", employeeRoleId, "active", true), adminA, clientIp);
        assertEquals(400, weak.getStatus(), weak.getContentAsString());

        var created = call(post("/api/v1/admin/users"), java.util.Map.of("name", "Eve Employee", "email", "eve@alpha.test",
                "position", "Clerk", "password", PASSWORD, "roleId", employeeRoleId, "active", true), adminA, clientIp);
        assertEquals(201, created.getStatus(), created.getContentAsString());

        var login = call(post("/api/v1/auth/login"), java.util.Map.of("email", "eve@alpha.test", "password", PASSWORD), null, clientIp);
        JsonNode body = data(login);
        assertEquals("AUTHENTICATED", body.get("status").asText(), "MFA optional for employees by default");
        String eve = body.get("accessToken").asText();

        assertEquals(403, call(get("/api/v1/hr/payroll"), null, eve, clientIp).getStatus());
        assertEquals(403, call(get("/api/v1/hr/employees"), null, eve, clientIp).getStatus());
        assertEquals(403, call(get("/api/v1/finance/ledger"), null, eve, clientIp).getStatus());
        assertEquals(403, call(get("/api/v1/admin/users"), null, eve, clientIp).getStatus());
        assertEquals(403, call(get("/api/v1/settings/security/audit-logs"), null, eve, clientIp).getStatus());
        assertEquals(200, call(get("/api/v1/auth/me"), null, eve, clientIp).getStatus());

        // HR list for admin A ignores a tenantId parameter pointing at company B.
        var hr = call(get("/api/v1/hr/employees").param("tenantId", String.valueOf(tenantB)), null, adminA, clientIp);
        assertEquals(200, hr.getStatus());
    }

    @Test
    @Order(5)
    void refreshRotatesViaCookieAndReuseKillsTheSession() throws Exception {
        String clientIp = freshIp();
        var login = call(post("/api/v1/auth/login"), java.util.Map.of("email", "eve@alpha.test", "password", PASSWORD), null, clientIp);
        Cookie first = refreshCookie(login);

        var noHeader = mvc.perform(post("/api/v1/auth/refresh").with(ip(clientIp)).cookie(first)).andReturn().getResponse();
        assertEquals(403, noHeader.getStatus(), "X-Requested-With is required (CSRF defence)");

        var rotated = mvc.perform(post("/api/v1/auth/refresh").with(ip(clientIp)).cookie(first)
                .header("X-Requested-With", "XMLHttpRequest")).andReturn().getResponse();
        assertEquals(200, rotated.getStatus(), rotated.getContentAsString());
        Cookie second = refreshCookie(rotated);
        assertNotEquals(first.getValue(), second.getValue());
        String access = data(rotated).get("accessToken").asText();
        assertEquals(200, call(get("/api/v1/auth/me"), null, access, clientIp).getStatus());

        var replay = mvc.perform(post("/api/v1/auth/refresh").with(ip(clientIp)).cookie(first)
                .header("X-Requested-With", "XMLHttpRequest")).andReturn().getResponse();
        assertEquals(401, replay.getStatus());
        assertEquals(0, refreshCookie(replay).getMaxAge(), "dead cookie is cleared");

        var victim = mvc.perform(post("/api/v1/auth/refresh").with(ip(clientIp)).cookie(second)
                .header("X-Requested-With", "XMLHttpRequest")).andReturn().getResponse();
        assertEquals(401, victim.getStatus(), "whole family revoked after reuse");
    }

    @Test
    @Order(6)
    void logoutInvalidatesAccessAndRefreshTokens() throws Exception {
        String clientIp = freshIp();
        var login = call(post("/api/v1/auth/login"), java.util.Map.of("email", "eve@alpha.test", "password", PASSWORD), null, clientIp);
        String access = data(login).get("accessToken").asText();
        Cookie rt = refreshCookie(login);

        var out = mvc.perform(post("/api/v1/auth/logout").with(ip(clientIp)).cookie(rt)
                .header("Authorization", "Bearer " + access).header("X-Requested-With", "XMLHttpRequest")).andReturn().getResponse();
        assertEquals(200, out.getStatus());
        assertEquals(401, call(get("/api/v1/auth/me"), null, access, clientIp).getStatus(), "access token revoked");
        var refresh = mvc.perform(post("/api/v1/auth/refresh").with(ip(clientIp)).cookie(rt)
                .header("X-Requested-With", "XMLHttpRequest")).andReturn().getResponse();
        assertEquals(401, refresh.getStatus());
    }

    @Test
    @Order(7)
    void fiveBadPasswordsLockTheAccount() throws Exception {
        String clientIp = freshIp();
        for (int i = 0; i < 5; i++) {
            assertEquals(401, call(post("/api/v1/auth/login"), java.util.Map.of("email", "eve@alpha.test", "password", "Wrong!Pass" + i), null, clientIp).getStatus());
        }
        var locked = call(post("/api/v1/auth/login"), java.util.Map.of("email", "eve@alpha.test", "password", PASSWORD), null, clientIp);
        assertEquals(423, locked.getStatus());
        assertTrue(locked.getContentAsString().contains("ACCOUNT_LOCKED"));
    }

    @Test
    @Order(8)
    void loginEndpointIsRateLimitedPerIp() throws Exception {
        String clientIp = freshIp();
        int last = 0;
        for (int i = 0; i < 11; i++) {
            last = call(post("/api/v1/auth/login"), java.util.Map.of("email", "nobody" + i + "@x.test", "password", "Whatever!123"), null, clientIp).getStatus();
        }
        assertEquals(429, last);
        assertEquals(401, call(post("/api/v1/auth/login"), java.util.Map.of("email", "nobody@x.test", "password", "Whatever!123"), null, freshIp()).getStatus(),
                "other clients unaffected");
    }

    @Test
    @Order(9)
    void securityEventsAreAuditedPerCompanyAndVisibleOnlyToThatCompany() throws Exception {
        String clientIp = freshIp();
        JsonNode logsA = data(call(get("/api/v1/settings/security/audit-logs").param("size", "100"), null, adminA, clientIp));
        String a = logsA.toString();
        for (String action : new String[]{"SIGNUP", "MFA_ENABLED", "LOGIN", "USER_CREATED", "ACCOUNT_LOCKED", "REFRESH_TOKEN_REUSE", "LOGOUT"}) {
            assertTrue(a.contains("\"" + action + "\""), "missing audit action " + action);
        }
        assertFalse(a.contains(PASSWORD), "no passwords in audit log");
        assertFalse(a.contains("admin@beta.test"), "company A sees no company B events");

        String b = data(call(get("/api/v1/settings/security/audit-logs").param("size", "100"), null, adminBToken, clientIp)).toString();
        assertFalse(b.contains("eve@alpha.test") || b.contains("USER_CREATED"), "company B sees no company A events");
    }

    @Test
    @Order(10)
    void securityHeadersArePresent() throws Exception {
        var r = call(get("/api/v1/auth/password-policy"), null, null, freshIp());
        assertEquals(200, r.getStatus());
        assertEquals("default-src 'none'; frame-ancestors 'none'", r.getHeader("Content-Security-Policy"));
        assertEquals("DENY", r.getHeader("X-Frame-Options"));
        assertEquals("nosniff", r.getHeader("X-Content-Type-Options"));
        assertEquals(10, data(r).get("minLength").asInt());
        assertNotNull(Base64.getDecoder());
    }
}
