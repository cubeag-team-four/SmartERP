package com.cubeage.erp.admin.service;

import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.common.exception.ForbiddenException;
import com.cubeage.erp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RoleAssignmentGuardTest {

    private final RoleAssignmentGuard guard = new RoleAssignmentGuard();

    @AfterEach
    void tearDown() { TestAuth.clear(); }

    @Test
    void tenantAdminCannotGrantSuperAdmin() {
        TestAuth.loginAs(1, 10, "TENANT_ADMIN");
        Role superAdmin = TestAuth.role(10, "SUPER_ADMIN");
        assertThrows(ForbiddenException.class, () -> guard.assertCanGrant(List.of(superAdmin)));
    }

    @Test
    void reservedNameMatchingIsCaseAndSpaceInsensitive() {
        TestAuth.loginAs(1, 10, "TENANT_ADMIN");
        assertThrows(ForbiddenException.class, () -> guard.assertCanGrant(List.of(TestAuth.role(10, "super admin"))));
        assertThrows(ForbiddenException.class, () -> guard.assertCanCreateRoleNamed(" Super_Admin "));
    }

    @Test
    void tenantAdminCanGrantOrdinaryRoles() {
        TestAuth.loginAs(1, 10, "TENANT_ADMIN");
        assertDoesNotThrow(() -> guard.assertCanGrant(List.of(TestAuth.role(10, "FINANCE_MANAGER"), TestAuth.role(10, "EMPLOYEE"))));
    }

    @Test
    void superAdminCanGrantSuperAdmin() {
        TestAuth.loginAs(1, 10, "SUPER_ADMIN");
        assertDoesNotThrow(() -> guard.assertCanGrant(List.of(TestAuth.role(10, "SUPER_ADMIN"))));
    }

    @Test
    void tenantAdminCannotCreateRolesNamedLikeSystemRoles() {
        TestAuth.loginAs(1, 10, "TENANT_ADMIN");
        assertThrows(ForbiddenException.class, () -> guard.assertCanCreateRoleNamed("TENANT_ADMIN"));
        assertThrows(ForbiddenException.class, () -> guard.assertCanCreateRoleNamed("hr manager"));
        assertDoesNotThrow(() -> guard.assertCanCreateRoleNamed("Warehouse Supervisor"));
    }

    @Test
    void tenantAdminCannotChangeSuperAdminRolePermissions() {
        TestAuth.loginAs(1, 10, "TENANT_ADMIN");
        assertThrows(ForbiddenException.class, () -> guard.assertCanManageRole(TestAuth.role(10, "SUPER_ADMIN")));
    }

    @Test
    void usersCannotActOnTheirOwnAccount() {
        TestAuth.loginAs(7, 10, "TENANT_ADMIN");
        assertThrows(ForbiddenException.class, () -> guard.assertNotSelf(7L, "delete"));
        assertDoesNotThrow(() -> guard.assertNotSelf(8L, "delete"));
    }

    @Test
    void tenantAdminIsPinnedToOwnTenant() {
        TestAuth.loginAs(1, 10, "TENANT_ADMIN");
        assertEquals(10L, guard.effectiveTenant(null));
        assertEquals(10L, guard.effectiveTenant(10L));
        assertThrows(ForbiddenException.class, () -> guard.effectiveTenant(11L));
    }

    @Test
    void superAdminMayTargetAnotherTenant() {
        TestAuth.loginAs(1, 10, "SUPER_ADMIN");
        assertEquals(11L, guard.effectiveTenant(11L));
    }
}
