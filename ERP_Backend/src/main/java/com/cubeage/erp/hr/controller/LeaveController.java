package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.leave.LeaveBalanceResponse;
import com.cubeage.erp.hr.dto.leave.LeaveRequestDto;
import com.cubeage.erp.hr.dto.leave.LeaveResponse;
import com.cubeage.erp.hr.entity.Employee;
import com.cubeage.erp.hr.service.LeaveService;
import com.cubeage.erp.common.exception.ForbiddenException;
import com.cubeage.erp.common.exception.ResourceNotFoundException;
import com.cubeage.erp.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/hr/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    /** Tenant is always taken from the authenticated principal, never from the request. */
    private Long currentTenantId() {
        return SecurityUtils.currentTenantId();
    }

    private static boolean isStaffAdmin() {
        return SecurityUtils.hasRole("SUPER_ADMIN")
                || SecurityUtils.hasRole("TENANT_ADMIN")
                || SecurityUtils.hasRole("HR_MANAGER");
    }

    /**
     * HR staff may act on any employee in their tenant. Everyone else is pinned to their own
     * employee profile; a client-supplied employeeId is never honoured for them, and a user
     * without a linked profile is refused rather than falling back to the requested id.
     */
    private Long resolveScopedEmployeeId(Long tenantId, Long requestedEmployeeId) {
        if (isStaffAdmin()) {
            return requestedEmployeeId;
        }
        return leaveService.findCurrentEmployee(tenantId)
                .map(Employee::getId)
                .orElseThrow(() -> new ForbiddenException("No employee profile is linked to this account"));
    }

    @GetMapping("/balance")
    @PreAuthorize("isAuthenticated()")
    public LeaveBalanceResponse getLeaveBalance(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Integer year
    ) {
        Long tid = currentTenantId();
        boolean isStaffAdmin = SecurityUtils.hasRole("SUPER_ADMIN")
                || SecurityUtils.hasRole("TENANT_ADMIN")
                || SecurityUtils.hasRole("HR_MANAGER");

        if (isStaffAdmin) {
            if (employeeId != null) {
                return leaveService.getLeaveBalance(tid, employeeId, year);
            }
            Optional<Employee> selfEmp = leaveService.findCurrentEmployee(tid);
            if (selfEmp.isPresent()) {
                return leaveService.getLeaveBalance(tid, selfEmp.get().getId(), year);
            }
            int targetYear = (year != null && year > 2000) ? year : LocalDate.now().getYear();
            return LeaveBalanceResponse.builder()
                    .totalLeaves(0.0)
                    .remainingLeaves(0.0)
                    .pendingLeaves(0.0)
                    .takenLeaves(0.0)
                    .leaveYear(targetYear)
                    .employeeId(null)
                    .employeeName("Staff Admin (No Employee Profile)")
                    .build();
        }

        Long eid = resolveScopedEmployeeId(tid, employeeId);
        return leaveService.getLeaveBalance(tid, eid, year);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<LeaveResponse> getLeaves(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer year
    ) {
        Long tid = currentTenantId();
        Long eid = resolveScopedEmployeeId(tid, employeeId);
        return leaveService.getLeaves(tid, eid, status, year);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public LeaveResponse getLeave(
            @PathVariable Long id
    ) {
        Long tid = currentTenantId();
        LeaveResponse leave = leaveService.getLeave(tid, id);
        if (!isStaffAdmin() && !resolveScopedEmployeeId(tid, null).equals(leave.getEmployeeId())) {
            // Same response as a missing record, so ids of other employees' leaves are not confirmed.
            throw new ResourceNotFoundException("Leave request not found");
        }
        return leave;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LeaveResponse> createLeave(
            @RequestBody LeaveRequestDto request
    ) {
        Long tid = currentTenantId();
        Long eid = resolveScopedEmployeeId(tid, request.getEmployeeId());
        LeaveResponse response = leaveService.createLeave(tid, eid, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYEE') and !hasAnyRole('HR_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN')")
    public LeaveResponse updateLeave(
            @PathVariable Long id,
            @RequestBody LeaveRequestDto request
    ) {
        Long tid = currentTenantId();
        Long eid = resolveScopedEmployeeId(tid, null);
        return leaveService.updateLeave(tid, id, eid, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('EMPLOYEE') and !hasAnyRole('HR_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN')")
    public LeaveResponse cancelLeave(
            @PathVariable Long id
    ) {
        Long tid = currentTenantId();
        Long eid = resolveScopedEmployeeId(tid, null);
        return leaveService.cancelLeave(tid, id, eid);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('HR_MANAGER','TENANT_ADMIN','SUPER_ADMIN')")
    public LeaveResponse approveLeave(
            @PathVariable Long id
    ) {
        return leaveService.approveLeave(currentTenantId(), id);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('HR_MANAGER','TENANT_ADMIN','SUPER_ADMIN')")
    public LeaveResponse rejectLeave(
            @PathVariable Long id
    ) {
        return leaveService.rejectLeave(currentTenantId(), id);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HR_MANAGER','TENANT_ADMIN','SUPER_ADMIN')")
    public LeaveResponse updateStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        return leaveService.updateStatus(currentTenantId(), id, status);
    }

    @GetMapping("/export")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportLeaves(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Integer year
    ) {
        Long tid = currentTenantId();
        Long eid = resolveScopedEmployeeId(tid, employeeId);
        byte[] csv = leaveService.exportLeavesCsv(tid, eid, year);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"leave-requests.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
