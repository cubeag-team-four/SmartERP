package com.cubeage.erp.company.controller;

import com.cubeage.erp.company.dto.CompanyManagementDtos.*;
import com.cubeage.erp.company.enums.CompanyRecordStatus;
import com.cubeage.erp.company.service.CompanyManagementService;
import com.cubeage.erp.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Year;
import java.util.List;

@RestController
@RequestMapping("/api/v1/company/{companyId}/holidays")
@RequiredArgsConstructor
@PreAuthorize("@permissionEvaluator.has(authentication,'COMPANY_MANAGEMENT','VIEW')")
public class HolidayController {
    private final CompanyManagementService service;

    @GetMapping
    public List<HolidayResponse> list(@PathVariable Long companyId, @RequestParam(required = false) Integer year,
                                      @RequestParam(required = false) String type,
                                      @RequestParam(required = false) String appliesTo,
                                      @RequestParam(required = false) String status,
                                      @RequestParam(required = false) String search) {
        return service.holidays(SecurityUtils.currentTenantId(), companyId,
                year == null ? Year.now().getValue() : year, type, appliesTo,
                status == null || status.isBlank() || "All".equalsIgnoreCase(status)
                        ? null : CompanyRecordStatus.from(status), search);
    }
    @GetMapping("/{id}") public HolidayResponse get(@PathVariable Long companyId, @PathVariable Long id) {
        return service.holiday(SecurityUtils.currentTenantId(), companyId, id);
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionEvaluator.has(authentication,'COMPANY_MANAGEMENT','CREATE')")
    public HolidayResponse create(@PathVariable Long companyId, @Valid @RequestBody HolidayRequest request) {
        return service.createHoliday(SecurityUtils.currentTenantId(), companyId, request);
    }
    @PutMapping("/{id}") @PreAuthorize("@permissionEvaluator.has(authentication,'COMPANY_MANAGEMENT','EDIT')")
    public HolidayResponse update(@PathVariable Long companyId, @PathVariable Long id,
                                  @Valid @RequestBody HolidayRequest request) {
        return service.updateHoliday(SecurityUtils.currentTenantId(), companyId, id, request);
    }
    @DeleteMapping("/{id}") @PreAuthorize("@permissionEvaluator.has(authentication,'COMPANY_MANAGEMENT','DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long companyId, @PathVariable Long id) {
        service.deleteHoliday(SecurityUtils.currentTenantId(), companyId, id);
        return ResponseEntity.noContent().build();
    }
}
