package com.cubeage.erp.finance.controller;

import com.cubeage.erp.finance.dto.journal.*;
import com.cubeage.erp.finance.service.JournalEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController 
@RequestMapping("/api/v1/finance/journals") 
@RequiredArgsConstructor
public class JournalEntryController {
	private final JournalEntryService service;

	@PostMapping 
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAnyRole('TENANT_ADMIN','FINANCE_MANAGER')")
	public JournalEntryResponse create(@RequestHeader("X-Tenant-Id") Long tenantId,
										@Valid @RequestBody CreateJournalEntryRequest request) {
		return service.create(tenantId, request);
	}

	@GetMapping 
	@PreAuthorize("isAuthenticated()")
	public List<JournalEntryResponse> all(@RequestHeader("X-Tenant-Id") Long tenantId) { return service.all(tenantId); }
}
