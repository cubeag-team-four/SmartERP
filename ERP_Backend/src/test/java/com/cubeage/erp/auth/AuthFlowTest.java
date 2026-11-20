package com.cubeage.erp.auth;

import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.auth.dto.*;
import com.cubeage.erp.auth.entity.RefreshToken;
import com.cubeage.erp.auth.exception.AuthException;
import com.cubeage.erp.auth.security.TokenHasher;
import com.cubeage.erp.auth.service.AuthService;
import com.cubeage.erp.auth.service.ClientInfo;
import com.cubeage.erp.auth.service.SessionService;
import com.cubeage.erp.security.user.UserPrincipal;
import com.cubeage.erp.tenant.entity.Tenant;
import com.cubeage.erp.tenant.enums.TenantStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AuthFlowTest {

    private static final ClientInfo CLIENT = new ClientInfo("203.0.113.7", "JUnit");

    private AuthFixture f;
    private Tenant acme;

    @BeforeEach
    void setUp() {
        f = new AuthFixture();
        acme = f.tenant("acme", TenantStatus.ACTIVE);
    }

    private AuthService.LoginResult login(String email, String password) {
        return f.auth.login(new LoginRequest(email, password, null), CLIENT);
    }

    private static String status(AuthException e) {
        return e.getStatus().value() + " " + e.getCode();
    }

    @Nested
    class Login {

        @Test
        void validLoginIssuesSessionWithHashedRefreshToken() {
            f.user(acme, "emp@acme.in", "EMPLOYEE");
            AuthService.LoginResult result = login("EMP@acme.in", AuthFixture.PASSWORD);

            assertEquals(LoginResponse.AUTHENTICATED, result.body().status());
            assertNotNull(result.body().accessToken());
            assertNull(result.body().mfaToken());
            assertEquals(900, result.body().expiresIn());
            assertEquals("EMPLOYEE", result.body().role());
            assertEquals("acme", result.body().tenantCode());

            String raw = result.session().refreshToken();
            RefreshToken stored = f.refreshTokens.get(0);
            assertEquals(TokenHasher.sha256Hex(raw), stored.getTokenHash(), "only the hash is stored");
            assertNotEquals(raw, stored.getTokenHash());
            assertEquals(1, f.auditCount("LOGIN", "SUCCESS"));
        }

        @Test
        void wrongPasswordFailsGenericallyAndIsAudited() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            AuthException e = assertThrows(AuthException.class, () -> login("emp@acme.in", "Wrong!Password99"));
            assertEquals("401 INVALID_CREDENTIALS", status(e));
            assertEquals("Invalid email or password", e.getMessage());
            assertEquals(1, u.getFailedLoginCount());
            assertEquals(1, f.auditCount("LOGIN", "FAILURE"));
        }

        @Test
        void unknownEmailGetsTheSameMessageAsWrongPassword() {
            AuthException e = assertThrows(AuthException.class, () -> login("ghost@acme.in", AuthFixture.PASSWORD));
            assertEquals("401 INVALID_CREDENTIALS", status(e));
            assertEquals("Invalid email or password", e.getMessage());
        }

        @Test
        void fiveFailuresLockTheAccountEvenAgainstTheCorrectPassword() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            for (int i = 0; i < 5; i++) {
                assertThrows(AuthException.class, () -> login("emp@acme.in", "Wrong!Password99"));
            }
            assertTrue(u.isLocked(Instant.now()));
            assertTrue(u.getLockedUntil().isBefore(Instant.now().plus(16, ChronoUnit.MINUTES)), "lock is temporary");
            assertEquals(1, f.auditCount("ACCOUNT_LOCKED", "DENIED"));

            AuthException e = assertThrows(AuthException.class, () -> login("emp@acme.in", AuthFixture.PASSWORD));
            assertEquals("423 ACCOUNT_LOCKED", status(e));
        }

        @Test
        void lockExpiresAndSuccessfulLoginClearsTheCounter() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            u.setLockedUntil(Instant.now().minusSeconds(1));
            u.setFailedLoginCount(3);
            assertEquals(LoginResponse.AUTHENTICATED, login("emp@acme.in", AuthFixture.PASSWORD).body().status());
            assertEquals(0, u.getFailedLoginCount());
            assertNull(u.getLockedUntil());
        }

        @Test
        void unknownEmailsAlsoLockSoLockoutDoesNotRevealAccounts() {
            for (int i = 0; i < 5; i++) {
                assertThrows(AuthException.class, () -> login("ghost@acme.in", "Wrong!Password99"));
            }
            AuthException e = assertThrows(AuthException.class, () -> login("ghost@acme.in", "Wrong!Password99"));
            assertEquals("423 ACCOUNT_LOCKED", status(e));
        }

        @Test
        void inactiveUserCannotLogIn() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            u.setActive(false);
            AuthException e = assertThrows(AuthException.class, () -> login("emp@acme.in", AuthFixture.PASSWORD));
            assertEquals("401 INVALID_CREDENTIALS", status(e));
        }

        @Test
        void suspendedCompanyCannotLogIn() {
            Tenant suspended = f.tenant("frozen", TenantStatus.SUSPENDED);
            f.user(suspended, "emp@frozen.in", "EMPLOYEE");
            AuthException e = assertThrows(AuthException.class, () -> login("emp@frozen.in", AuthFixture.PASSWORD));
            assertEquals("403 TENANT_INACTIVE", status(e));
        }

        @Test
        void sameEmailInTwoCompaniesRequiresTenantSelectionOnlyAfterPasswordCheck() {
            Tenant beta = f.tenant("beta", TenantStatus.ACTIVE);
            f.user(acme, "shared@x.in", "EMPLOYEE");
            f.user(beta, "shared@x.in", "EMPLOYEE");

            AuthException wrong = assertThrows(AuthException.class, () -> login("shared@x.in", "Wrong!Password99"));
            assertEquals("401 INVALID_CREDENTIALS", status(wrong), "no company list without the right password");

            AuthException choose = assertThrows(AuthException.class, () -> login("shared@x.in", AuthFixture.PASSWORD));
            assertEquals("409 TENANT_SELECTION_REQUIRED", status(choose));
            assertEquals(2, choose.getTenants().size());

            AuthService.LoginResult ok = f.auth.login(new LoginRequest("shared@x.in", AuthFixture.PASSWORD, "beta"), CLIENT);
            assertEquals(beta.getId(), ok.body().tenantId());
        }
    }

    @Nested
    class Mfa {

        @Test
        void privilegedRolesCannotGetASessionWithoutMfa() {
            f.user(acme, "admin@acme.in", "TENANT_ADMIN");
            AuthService.LoginResult result = login("admin@acme.in", AuthFixture.PASSWORD);
            assertEquals(LoginResponse.MFA_ENROLLMENT_REQUIRED, result.body().status());
            assertNull(result.session());
            assertNull(result.body().accessToken());
            assertNotNull(result.body().mfaToken());
            assertTrue(f.refreshTokens.isEmpty());
            assertTrue(f.jwtService.parseAccessToken(result.body().mfaToken()).isEmpty(), "MFA token is not an access token");
        }

        @Test
        void enrollmentRequiresAValidCodeThenReturnsEightSingleUseRecoveryCodes() {
            User admin = f.user(acme, "admin@acme.in", "TENANT_ADMIN");
            String mfaToken = login("admin@acme.in", AuthFixture.PASSWORD).body().mfaToken();

            MfaSetupResponse setup = f.auth.mfaSetup(mfaToken, null);
            assertTrue(setup.otpauthUri().startsWith("otpauth://totp/"));
            assertFalse(admin.getMfaSecret().contains(setup.secret()), "secret stored encrypted");
            assertFalse(admin.getMfaEnabled(), "not enabled until confirmed");

            assertThrows(AuthException.class, () -> f.auth.mfaEnable(new MfaEnableRequest(mfaToken, "000000"), null, CLIENT));
            assertFalse(admin.getMfaEnabled());

            AuthService.LoginResult done = f.auth.mfaEnable(new MfaEnableRequest(mfaToken, f.currentCode(admin)), null, CLIENT);
            assertTrue(admin.getMfaEnabled());
            assertEquals(LoginResponse.AUTHENTICATED, done.body().status());
            assertEquals(8, done.body().recoveryCodes().size());
            assertNotNull(done.session());
            assertEquals(1, f.auditCount("MFA_ENABLED", "SUCCESS"));
            f.recoveryCodes.forEach(c -> assertFalse(done.body().recoveryCodes().contains(c.getCodeHash()), "codes stored hashed"));
        }

        @Test
        void enrolledUserMustPassTotpAndInvalidCodesAreRejected() {
            User admin = enrolledAdmin();
            AuthService.LoginResult step1 = login("admin@acme.in", AuthFixture.PASSWORD);
            assertEquals(LoginResponse.MFA_REQUIRED, step1.body().status());
            assertNull(step1.session());

            AuthException bad = assertThrows(AuthException.class,
                    () -> f.auth.verifyMfa(new MfaVerifyRequest(step1.body().mfaToken(), "123456", null), CLIENT));
            assertEquals("401 INVALID_MFA_CODE", status(bad));
            assertEquals(1, admin.getFailedLoginCount(), "MFA failures count towards lockout");

            SessionService.IssuedSession session = f.auth.verifyMfa(
                    new MfaVerifyRequest(step1.body().mfaToken(), f.codeForStep(admin, 1), null), CLIENT);
            assertEquals(LoginResponse.AUTHENTICATED, session.body().status());
        }

        @Test
        void recoveryCodesWorkExactlyOnce() {
            enrolledAdmin();
            List<String> codes = lastRecoveryCodes;
            String mfaToken = login("admin@acme.in", AuthFixture.PASSWORD).body().mfaToken();
            assertNotNull(f.auth.verifyMfa(new MfaVerifyRequest(mfaToken, null, codes.get(0).toLowerCase()), CLIENT));

            String mfaToken2 = login("admin@acme.in", AuthFixture.PASSWORD).body().mfaToken();
            AuthException reused = assertThrows(AuthException.class,
                    () -> f.auth.verifyMfa(new MfaVerifyRequest(mfaToken2, null, codes.get(0)), CLIENT));
            assertEquals("401 INVALID_MFA_CODE", status(reused));
            assertEquals(1, f.auditCount("MFA_RECOVERY_CODE_USED", "SUCCESS"));
        }

        @Test
        void regeneratingRecoveryCodesInvalidatesTheOldOnes() {
            User admin = enrolledAdmin();
            List<String> old = lastRecoveryCodes;
            RecoveryCodesResponse fresh = f.auth.regenerateRecoveryCodes(UserPrincipal.from(admin), f.codeForStep(admin, 1), CLIENT);
            assertEquals(8, fresh.recoveryCodes().size());
            String mfaToken = login("admin@acme.in", AuthFixture.PASSWORD).body().mfaToken();
            assertThrows(AuthException.class, () -> f.auth.verifyMfa(new MfaVerifyRequest(mfaToken, null, old.get(1)), CLIENT));
        }

        @Test
        void privilegedUsersCannotDisableMfa() {
            User admin = enrolledAdmin();
            AuthException e = assertThrows(AuthException.class, () -> f.auth.disableMfa(UserPrincipal.from(admin),
                    new MfaDisableRequest(AuthFixture.PASSWORD, f.codeForStep(admin, 1)), CLIENT));
            assertEquals("403 MFA_REQUIRED_BY_POLICY", status(e));
        }

        @Test
        void mfaTokenStopsWorkingOnceSessionsAreRevoked() {
            User admin = enrolledAdmin();
            String mfaToken = login("admin@acme.in", AuthFixture.PASSWORD).body().mfaToken();
            f.sessions.revokeAllSessions(admin, "TEST");
            AuthException e = assertThrows(AuthException.class,
                    () -> f.auth.verifyMfa(new MfaVerifyRequest(mfaToken, f.codeForStep(admin, 1), null), CLIENT));
            assertEquals("401 MFA_SESSION_EXPIRED", status(e));
        }

        private List<String> lastRecoveryCodes;

        private User enrolledAdmin() {
            User admin = f.user(acme, "admin@acme.in", "TENANT_ADMIN");
            String mfaToken = login("admin@acme.in", AuthFixture.PASSWORD).body().mfaToken();
            f.auth.mfaSetup(mfaToken, null);
            lastRecoveryCodes = f.auth.mfaEnable(new MfaEnableRequest(mfaToken, f.currentCode(admin)), null, CLIENT).body().recoveryCodes();
            return admin;
        }
    }

    @Nested
    class Sessions {

        @Test
        void refreshRotatesAndTheOldTokenCannotBeUsedAgain() {
            f.user(acme, "emp@acme.in", "EMPLOYEE");
            String first = login("emp@acme.in", AuthFixture.PASSWORD).session().refreshToken();

            SessionService.IssuedSession rotated = f.sessions.rotate(first, CLIENT);
            assertNotEquals(first, rotated.refreshToken());
            assertNotNull(rotated.body().accessToken());
            assertEquals(2, f.refreshTokens.size());
            assertEquals(f.refreshTokens.get(0).getFamilyId(), f.refreshTokens.get(1).getFamilyId());
        }

        @Test
        void reuseOfARotatedTokenRevokesTheWholeFamily() {
            f.user(acme, "emp@acme.in", "EMPLOYEE");
            String stolen = login("emp@acme.in", AuthFixture.PASSWORD).session().refreshToken();
            String legit = f.sessions.rotate(stolen, CLIENT).refreshToken();

            AuthException e = assertThrows(AuthException.class, () -> f.sessions.rotate(stolen, CLIENT));
            assertEquals("401 INVALID_REFRESH_TOKEN", status(e));
            assertEquals(1, f.auditCount("REFRESH_TOKEN_REUSE", "DENIED"));
            assertThrows(AuthException.class, () -> f.sessions.rotate(legit, CLIENT), "family revoked: attacker and victim both re-login");
        }

        @Test
        void expiredOrUnknownRefreshTokensAreRejected() {
            f.user(acme, "emp@acme.in", "EMPLOYEE");
            String raw = login("emp@acme.in", AuthFixture.PASSWORD).session().refreshToken();
            f.refreshTokens.get(0).setExpiresAt(Instant.now().minusSeconds(1));
            assertThrows(AuthException.class, () -> f.sessions.rotate(raw, CLIENT));
            assertThrows(AuthException.class, () -> f.sessions.rotate("not-a-token", CLIENT));
            assertThrows(AuthException.class, () -> f.sessions.rotate(null, CLIENT));
        }

        @Test
        void logoutRevokesTheRefreshFamilyAndInvalidatesTheAccessToken() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            SessionService.IssuedSession s = login("emp@acme.in", AuthFixture.PASSWORD).session();
            int versionBefore = u.getTokenVersion();

            f.auth.logout(UserPrincipal.from(u), s.refreshToken(), CLIENT);

            assertTrue(f.refreshTokens.get(0).getRevoked());
            assertThrows(AuthException.class, () -> f.sessions.rotate(s.refreshToken(), CLIENT));
            int tokenVersionInJwt = f.jwtService.parseAccessToken(s.body().accessToken()).orElseThrow().tokenVersion();
            assertEquals(versionBefore, tokenVersionInJwt);
            assertNotEquals(u.getTokenVersion(), tokenVersionInJwt, "access token is now stale");
        }

        @Test
        void disabledAccountsCannotRefresh() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            String raw = login("emp@acme.in", AuthFixture.PASSWORD).session().refreshToken();
            u.setActive(false);
            assertThrows(AuthException.class, () -> f.sessions.rotate(raw, CLIENT));
        }
    }

    @Nested
    class Passwords {

        @Test
        void passwordChangeRevokesEverySession() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            String raw = login("emp@acme.in", AuthFixture.PASSWORD).session().refreshToken();
            int before = u.getTokenVersion();

            f.auth.changePassword(UserPrincipal.from(u), new ChangePasswordRequest(AuthFixture.PASSWORD, "Basalt#Meadow77"), CLIENT);

            assertTrue(f.encoder.matches("Basalt#Meadow77", u.getPasswordHash()));
            assertTrue(u.getTokenVersion() > before);
            assertThrows(AuthException.class, () -> f.sessions.rotate(raw, CLIENT));
            assertEquals(1, f.auditCount("PASSWORD_CHANGE", "SUCCESS"));
        }

        @Test
        void passwordChangeRequiresTheCurrentPassword() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            AuthException e = assertThrows(AuthException.class, () -> f.auth.changePassword(UserPrincipal.from(u),
                    new ChangePasswordRequest("Wrong!Password99", "Basalt#Meadow77"), CLIENT));
            assertEquals("400 INVALID_PASSWORD", status(e));
        }

        @Test
        void forgotPasswordDoesNotRevealWhetherTheEmailExists() {
            assertDoesNotThrow(() -> f.auth.forgotPassword(new ForgotPasswordRequest("ghost@acme.in"), CLIENT));
            assertTrue(f.sentResetLinks.isEmpty());
        }

        @Test
        void resetTokenIsHashedSingleUseAndRevokesSessions() {
            User u = f.user(acme, "emp@acme.in", "EMPLOYEE");
            String session = login("emp@acme.in", AuthFixture.PASSWORD).session().refreshToken();
            f.auth.forgotPassword(new ForgotPasswordRequest("emp@acme.in"), CLIENT);
            String raw = f.sentResetLinks.get(0).substring(f.sentResetLinks.get(0).indexOf("token=") + 6);
            assertEquals(TokenHasher.sha256Hex(raw), f.resetTokens.get(0).getTokenHash());

            f.auth.resetPassword(new ResetPasswordRequest(raw, "Basalt#Meadow77"), CLIENT);
            assertTrue(f.encoder.matches("Basalt#Meadow77", u.getPasswordHash()));
            assertThrows(AuthException.class, () -> f.sessions.rotate(session, CLIENT), "old sessions revoked");

            AuthException reused = assertThrows(AuthException.class,
                    () -> f.auth.resetPassword(new ResetPasswordRequest(raw, "Another#Pass2026x"), CLIENT));
            assertEquals("400 INVALID_RESET_TOKEN", status(reused));
        }

        @Test
        void expiredResetTokensAreRejected() {
            f.user(acme, "emp@acme.in", "EMPLOYEE");
            f.auth.forgotPassword(new ForgotPasswordRequest("emp@acme.in"), CLIENT);
            String raw = f.sentResetLinks.get(0).substring(f.sentResetLinks.get(0).indexOf("token=") + 6);
            f.resetTokens.get(0).setExpiresAt(Instant.now().minusSeconds(1));
            assertThrows(AuthException.class, () -> f.auth.resetPassword(new ResetPasswordRequest(raw, "Basalt#Meadow77"), CLIENT));
        }

        @Test
        void newResetRequestInvalidatesEarlierLinks() {
            f.user(acme, "emp@acme.in", "EMPLOYEE");
            f.auth.forgotPassword(new ForgotPasswordRequest("emp@acme.in"), CLIENT);
            f.auth.forgotPassword(new ForgotPasswordRequest("emp@acme.in"), CLIENT);
            String first = f.sentResetLinks.get(0).substring(f.sentResetLinks.get(0).indexOf("token=") + 6);
            assertThrows(AuthException.class, () -> f.auth.resetPassword(new ResetPasswordRequest(first, "Basalt#Meadow77"), CLIENT));
        }
    }

    @Test
    void auditEntriesNeverContainSecrets() {
        User admin = f.user(acme, "admin@acme.in", "TENANT_ADMIN");
        String mfaToken = login("admin@acme.in", AuthFixture.PASSWORD).body().mfaToken();
        MfaSetupResponse setup = f.auth.mfaSetup(mfaToken, null);
        String code = f.currentCode(admin);
        List<String> recovery = f.auth.mfaEnable(new MfaEnableRequest(mfaToken, code), null, CLIENT).body().recoveryCodes();
        assertThrows(AuthException.class, () -> login("admin@acme.in", "Wrong!Password99"));

        String everything = f.auditLogs.toString() + f.auditLogs.stream().map(a -> a.getAction() + a.getDetails()).toList();
        assertFalse(everything.contains(AuthFixture.PASSWORD));
        assertFalse(everything.contains("Wrong!Password99"));
        assertFalse(everything.contains(setup.secret()));
        assertFalse(everything.contains(mfaToken));
        recovery.forEach(c -> assertFalse(everything.contains(c)));
    }
}
