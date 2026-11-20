package com.cubeage.erp.settings.controller;

import org.springframework.security.access.prepost.PreAuthorize;

import com.cubeage.erp.security.SecurityUtils;
import com.cubeage.erp.settings.dto.dashboard.SettingsDashboardResponse;
import com.cubeage.erp.settings.service.SettingsDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN')")
public class SettingsDashboardController {

    private final SettingsDashboardService service;

    @GetMapping
    public SettingsDashboardResponse dashboard() {
        return service.get(SecurityUtils.currentTenantId());
    }

    @GetMapping("/overview")
    public SettingsDashboardResponse overview() {
        return service.get(SecurityUtils.currentTenantId());
    }
}
