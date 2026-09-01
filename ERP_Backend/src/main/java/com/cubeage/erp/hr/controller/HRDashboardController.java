package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.dashboard.HRDashboardResponse;
import com.cubeage.erp.hr.service.HRDashboardService;
import com.cubeage.erp.security.SecurityUtils;
import com.cubeage.erp.tenant.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hr/dashboard")
@RequiredArgsConstructor
public class HRDashboardController {

    private final HRDashboardService dashboardService;

    private Long resolveTenantId(Long tenantId) {
        if (tenantId != null) {
            return tenantId;
        }
        Long contextTenantId = TenantContext.getTenantId();
        if (contextTenantId != null) {
            return contextTenantId;
        }
        try {
            return SecurityUtils.currentTenantId();
        } catch (Exception e) {
            return 1L;
        }
    }

    @GetMapping
    public HRDashboardResponse getDashboard(
            @RequestParam(required = false) Long tenantId
    ) {
        return dashboardService.getDashboardSummary(resolveTenantId(tenantId));
    }

    @GetMapping("/summary")
    public HRDashboardResponse getSummary(
            @RequestParam(required = false) Long tenantId
    ) {
        return dashboardService.getDashboardSummary(resolveTenantId(tenantId));
    }
}
