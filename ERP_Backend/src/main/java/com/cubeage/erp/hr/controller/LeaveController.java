package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.leave.LeaveRequestDto;
import com.cubeage.erp.hr.dto.leave.LeaveResponse;
import com.cubeage.erp.hr.service.LeaveService;
import com.cubeage.erp.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/leaves")
@RequiredArgsConstructor
@PreAuthorize(
        "hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'HR') " +
                "or @permissionEvaluator.has(authentication, 'HR', 'VIEW')"
)
public class LeaveController {

    private final LeaveService leaveService;

    @GetMapping
    public List<LeaveResponse> getLeaves() {
        return leaveService.getLeaves(SecurityUtils.currentTenantId());
    }

    @PostMapping
    @PreAuthorize(
            "hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'HR') " +
                    "or @permissionEvaluator.has(authentication, 'HR', 'CREATE')"
    )
    public ResponseEntity<LeaveResponse> createLeave(
            @RequestBody LeaveRequestDto request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(leaveService.createLeave(
                        SecurityUtils.currentTenantId(),
                        request
                ));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize(
            "hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'HR') " +
                    "or @permissionEvaluator.has(authentication, 'HR', 'EDIT')"
    )
    public LeaveResponse approveLeave(@PathVariable Long id) {
        return leaveService.approveLeave(SecurityUtils.currentTenantId(), id);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize(
            "hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'HR') " +
                    "or @permissionEvaluator.has(authentication, 'HR', 'EDIT')"
    )
    public LeaveResponse rejectLeave(@PathVariable Long id) {
        return leaveService.rejectLeave(SecurityUtils.currentTenantId(), id);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize(
            "hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'HR') " +
                    "or @permissionEvaluator.has(authentication, 'HR', 'EDIT')"
    )
    public LeaveResponse updateStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        return leaveService.updateStatus(
                SecurityUtils.currentTenantId(),
                id,
                status
        );
    }
}