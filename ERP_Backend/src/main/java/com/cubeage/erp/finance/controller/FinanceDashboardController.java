package com.cubeage.erp.finance.controller;

import com.cubeage.erp.finance.dto.dashboard.FinanceDashboardResponse;
import com.cubeage.erp.finance.service.FinanceDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController 
@RequestMapping("/api/v1/finance/dashboard") 
@RequiredArgsConstructor
public class FinanceDashboardController {
	private final FinanceDashboardService service;
	@GetMapping 
	@PreAuthorize("isAuthenticated()")
	public FinanceDashboardResponse summary(@RequestHeader("X-Tenant-Id") Long tenantId) { return service.summary(tenantId); }
}
