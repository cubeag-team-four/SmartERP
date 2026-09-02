package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.leave.LeaveRequestDto;
import com.cubeage.erp.hr.dto.leave.LeaveResponse;
import com.cubeage.erp.hr.service.LeaveService;
import com.cubeage.erp.security.SecurityUtils;
import com.cubeage.erp.tenant.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    private Long resolveTenantId(Long tenantId) {
        if (tenantId != null) {
            return tenantId;
        }
        Long contextTenantId = TenantContext.getTenantId();
        if (contextTenantId != null) {
            return contextTenantId;
        }
        try {
            return SecurityUtils.currentTenantId();
        } catch (Exception e) {
            return 1L;
        }
    }

    @GetMapping
    public List<LeaveResponse> getLeaves(
            @RequestParam(required = false) Long tenantId
    ) {
        return leaveService.getLeaves(resolveTenantId(tenantId));
    }

    @PostMapping
    public ResponseEntity<LeaveResponse> createLeave(
            @RequestParam(required = false) Long tenantId,
            @RequestBody LeaveRequestDto request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(leaveService.createLeave(resolveTenantId(tenantId), request));
    }

    @PatchMapping("/{id}/approve")
    public LeaveResponse approveLeave(
            @RequestParam(required = false) Long tenantId,
            @PathVariable Long id
    ) {
        return leaveService.approveLeave(resolveTenantId(tenantId), id);
    }

    @PatchMapping("/{id}/reject")
    public LeaveResponse rejectLeave(
            @RequestParam(required = false) Long tenantId,
            @PathVariable Long id
    ) {
        return leaveService.rejectLeave(resolveTenantId(tenantId), id);
    }

    @PutMapping("/{id}/status")
    public LeaveResponse updateStatus(
            @RequestParam(required = false) Long tenantId,
            @PathVariable Long id,
            @RequestParam String status
    ) {
        return leaveService.updateStatus(resolveTenantId(tenantId), id, status);
    }
}
