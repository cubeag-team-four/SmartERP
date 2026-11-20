package com.cubeage.erp.security;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * The eight SmartERP business roles, mapped to the role identifiers already stored in the
 * {@code roles} table and used by existing {@code @PreAuthorize} rules. The stored names are
 * kept as they are; this class only gives them one canonical place in code.
 *
 * <pre>
 * Business role   Identifier
 * Super Admin     SUPER_ADMIN         (platform-wide)
 * Admin           TENANT_ADMIN        (company-wide)
 * Finance         FINANCE_MANAGER
 * Sales           SALES_MANAGER
 * HR Manager      HR_MANAGER
 * Operations      OPERATIONS_MANAGER
 * Inventory       INVENTORY_MANAGER
 * Employees       EMPLOYEE
 * </pre>
 */
public final class Roles {

    public static final String SUPER_ADMIN = "SUPER_ADMIN";
    public static final String TENANT_ADMIN = "TENANT_ADMIN";
    public static final String FINANCE_MANAGER = "FINANCE_MANAGER";
    public static final String SALES_MANAGER = "SALES_MANAGER";
    public static final String HR_MANAGER = "HR_MANAGER";
    public static final String OPERATIONS_MANAGER = "OPERATIONS_MANAGER";
    public static final String INVENTORY_MANAGER = "INVENTORY_MANAGER";
    public static final String EMPLOYEE = "EMPLOYEE";

    /** Company-level system roles created for every new company at signup. */
    public static final List<String> TENANT_SYSTEM_ROLES = List.of(
            TENANT_ADMIN, FINANCE_MANAGER, SALES_MANAGER, HR_MANAGER,
            OPERATIONS_MANAGER, INVENTORY_MANAGER, EMPLOYEE);

    /** Roles that only a Super Admin may create, rename, re-permission or grant. */
    public static final Set<String> PLATFORM_RESERVED = Set.of(SUPER_ADMIN);

    /** Roles that must complete MFA before a full session is issued. */
    public static final Set<String> MFA_MANDATORY = Set.of(SUPER_ADMIN, TENANT_ADMIN);

    private Roles() { }

    /** Same normalisation {@code UserPrincipal} applies when building ROLE_ authorities. */
    public static String normalize(String roleName) {
        return roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
    }

    public static boolean isPlatformReserved(String roleName) {
        return PLATFORM_RESERVED.contains(normalize(roleName));
    }

    /** Names a tenant may not use for a custom role (reserved or already a system role). */
    public static boolean isSystemName(String roleName) {
        String n = normalize(roleName);
        return PLATFORM_RESERVED.contains(n) || TENANT_SYSTEM_ROLES.contains(n);
    }
}
