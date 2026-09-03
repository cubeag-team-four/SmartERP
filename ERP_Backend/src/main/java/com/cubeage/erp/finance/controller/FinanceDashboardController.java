package com.cubeage.erp.finance.controller;

import com.cubeage.erp.finance.dto.dashboard.FinanceDashboardResponse;
import com.cubeage.erp.finance.service.FinanceDashboardService;
import com.cubeage.erp.finance.util.FinanceTenantResolver;
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
	public FinanceDashboardResponse summary(
			@RequestHeader(value = "X-Tenant-Id", required = false) Long tenantId
	) {
		return service.summary(FinanceTenantResolver.resolveTenantId(tenantId));
	}
}
