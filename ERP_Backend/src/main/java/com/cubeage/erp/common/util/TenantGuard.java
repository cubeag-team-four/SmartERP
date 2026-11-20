package com.cubeage.erp.common.util;

import com.cubeage.erp.common.exception.ForbiddenException;

/**
 * Fails closed when a service is called without a tenant.
 *
 * <p>Several services used to substitute a hard-coded tenant ({@code 1L}) when the tenant was
 * missing, which would silently read or write another company's data. Every tenant-scoped
 * service method must now receive the tenant resolved from the authenticated principal.
 */
public final class TenantGuard {

    private TenantGuard() { }

    public static Long require(Long tenantId) {
        if (tenantId == null) {
            throw new ForbiddenException("Tenant context is required");
        }
        return tenantId;
    }
}
