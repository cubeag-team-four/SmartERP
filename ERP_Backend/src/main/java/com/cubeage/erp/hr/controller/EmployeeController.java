package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.employee.CreateEmployeeRequest;
import com.cubeage.erp.hr.dto.employee.EmployeeResponse;
import com.cubeage.erp.hr.dto.employee.UpdateEmployeeRequest;
import com.cubeage.erp.hr.service.EmployeeService;
import com.cubeage.erp.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/employees")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','HR_MANAGER')")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    /** Tenant is always taken from the authenticated principal, never from the request. */
    private Long currentTenantId() {
        return SecurityUtils.currentTenantId();
    }

    @GetMapping
    public List<EmployeeResponse> getAllEmployees() {
        return employeeService.getAllEmployees(currentTenantId());
    }

    @GetMapping("/{id}")
    public EmployeeResponse getEmployee(
            @PathVariable Long id
    ) {
        return employeeService.getEmployee(currentTenantId(), id);
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> createEmployee(
            @RequestBody CreateEmployeeRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(employeeService.createEmployee(currentTenantId(), request));
    }

    @PutMapping("/{id}")
    public EmployeeResponse updateEmployee(
            @PathVariable Long id,
            @RequestBody UpdateEmployeeRequest request
    ) {
        return employeeService.updateEmployee(currentTenantId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEmployee(
            @PathVariable Long id
    ) {
        employeeService.deleteEmployee(currentTenantId(), id);
    }
}