package com.cubeage.erp.finance.util;

import com.cubeage.erp.common.exception.ForbiddenException;
import com.cubeage.erp.security.SecurityUtils;
import org.springframework.security.access.AccessDeniedException;
import com.cubeage.erp.tenant.context.TenantContext;

public final class FinanceTenantResolver {

    private FinanceTenantResolver() { }

    /**
     * Resolves the effective tenant ID for Finance operations.
     * 1. If the authenticated user is SUPER_ADMIN, honor the target headerTenantId or TenantContext.
     * 2. For standard users (TENANT_ADMIN, FINANCE_MANAGER), strictly enforce their own authenticated tenantId to prevent spoofing.
     * 3. Otherwise refuses: there is no fallback tenant.
     */
    public static Long resolveTenantId(Long headerTenantId) {
        try {
            if (SecurityUtils.hasRole("SUPER_ADMIN")) {
                if (headerTenantId != null) {
                    return headerTenantId;
                }
                Long contextTenantId = TenantContext.getTenantId();
                if (contextTenantId != null) {
                    return contextTenantId;
                }
            }
            Long authTenantId = SecurityUtils.currentTenantId();
            if (authTenantId != null) {
                return authTenantId;
            }
        } catch (AccessDeniedException ignored) {
            // Not authenticated as a UserPrincipal: fall through and refuse below.
        }
        // Never fall back to a client header or a hard-coded tenant: that would expose
        // another company's ledger to an unauthenticated or misconfigured caller.
        throw new ForbiddenException("Tenant context is required");
    }
}
