package com.cubeage.erp.superAdmin.service;

import com.cubeage.erp.superAdmin.dto.dashboard.SuperAdminDashboardResponse;
import com.cubeage.erp.superAdmin.dto.dashboard.RevenueSummaryResponse;
import com.cubeage.erp.superAdmin.dto.dashboard.SystemStatsResponse;

public interface SuperAdminDashboardService {
    SuperAdminDashboardResponse getDashboard();
    RevenueSummaryResponse getRevenueSummary();
    SystemStatsResponse getSystemStats();
}
