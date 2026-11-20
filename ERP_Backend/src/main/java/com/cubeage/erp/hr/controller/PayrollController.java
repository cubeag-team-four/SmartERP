package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.payroll.PayrollRequest;
import com.cubeage.erp.hr.dto.payroll.PayrollResponse;
import com.cubeage.erp.hr.dto.payroll.PayrollSummaryResponse;
import com.cubeage.erp.hr.service.PayrollService;
import com.cubeage.erp.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/payroll")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','HR_MANAGER')")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;

    /** Tenant is always taken from the authenticated principal, never from the request. */
    private Long currentTenantId() {
        return SecurityUtils.currentTenantId();
    }

    @GetMapping("/summary")
    public PayrollSummaryResponse getSummary() {
        return payrollService.getPayrollSummary(currentTenantId());
    }

    @GetMapping
    public List<PayrollResponse> getPayrolls() {
        return payrollService.getPayrolls(currentTenantId());
    }

    @PostMapping("/process")
    public ResponseEntity<PayrollResponse> processPayroll(
            @RequestBody(required = false) PayrollRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(payrollService.processPayroll(currentTenantId(), request));
    }
}
