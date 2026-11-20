package com.cubeage.erp.admin.service;

import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.common.exception.ForbiddenException;
import com.cubeage.erp.security.Roles;
import com.cubeage.erp.security.SecurityUtils;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Objects;

/**
 * Privilege-escalation checks shared by user and role administration.
 *
 * <ul>
 *   <li>Only a Super Admin can grant, create or re-permission a platform-reserved role.</li>
 *   <li>Nobody can change their own roles or active status, or delete their own account.</li>
 *   <li>A non-Super-Admin can only administer their own tenant.</li>
 * </ul>
 */
@Component
public class RoleAssignmentGuard {

    public boolean callerIsSuperAdmin() {
        return SecurityUtils.hasRole(Roles.SUPER_ADMIN);
    }

    /** Tenant an admin request acts on: the caller's own, unless a Super Admin names another. */
    public Long effectiveTenant(Long requestedTenantId) {
        Long own = SecurityUtils.currentTenantId();
        if (requestedTenantId == null || requestedTenantId.equals(own)) {
            return own;
        }
        if (callerIsSuperAdmin()) {
            return requestedTenantId;
        }
        throw new ForbiddenException("You can only administer your own company");
    }

    public void assertCanGrant(Collection<Role> roles) {
        if (callerIsSuperAdmin()) {
            return;
        }
        boolean reserved = roles.stream().anyMatch(role -> Roles.isPlatformReserved(role.getName()));
        if (reserved) {
            throw new ForbiddenException("Only a Super Admin can grant this role");
        }
    }

    public void assertCanManageRole(Role role) {
        if (Roles.isPlatformReserved(role.getName()) && !callerIsSuperAdmin()) {
            throw new ForbiddenException("Only a Super Admin can change this role");
        }
    }

    public void assertCanCreateRoleNamed(String name) {
        if (Roles.isSystemName(name) && !callerIsSuperAdmin()) {
            throw new ForbiddenException("This role name is reserved");
        }
    }

    public void assertNotSelf(Long targetUserId, String action) {
        if (Objects.equals(SecurityUtils.currentUserId(), targetUserId)) {
            throw new ForbiddenException("You cannot " + action + " your own account");
        }
    }
}
