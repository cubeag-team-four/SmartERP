package com.cubeage.erp.security;

import com.cubeage.erp.common.exception.ForbiddenException;
import com.cubeage.erp.common.util.TenantGuard;
import com.cubeage.erp.finance.util.FinanceTenantResolver;
import com.cubeage.erp.security.jwt.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class TenantFailClosedTest {

    @AfterEach
    void tearDown() { TestAuth.clear(); }

    @Test
    void missingTenantIsRefusedNotDefaultedToTenantOne() {
        assertThrows(ForbiddenException.class, () -> TenantGuard.require(null));
        assertEquals(42L, TenantGuard.require(42L));
    }

    @Test
    void financeResolverIgnoresHeaderForOrdinaryUsers() {
        TestAuth.loginAs(1, 10, "FINANCE_MANAGER");
        assertEquals(10L, FinanceTenantResolver.resolveTenantId(99L));
    }

    @Test
    void financeResolverRefusesUnauthenticatedCallsInsteadOfUsingHeaderOrTenantOne() {
        assertThrows(ForbiddenException.class, () -> FinanceTenantResolver.resolveTenantId(99L));
        assertThrows(ForbiddenException.class, () -> FinanceTenantResolver.resolveTenantId(null));
    }

    @Test
    void jwtServiceRefusesMissingWeakOrPublicDefaultSecrets() {
        assertThrows(IllegalStateException.class, () -> new JwtService("", 900000));
        assertThrows(IllegalStateException.class, () -> new JwtService("short-secret", 900000));
        assertThrows(IllegalStateException.class,
                () -> new JwtService("SmartERP-development-signing-key-change-in-production-2026", 900000));
        String strong = Base64.getEncoder().encodeToString(new byte[48]);
        assertDoesNotThrow(() -> new JwtService(strong, 900000));
    }
}
