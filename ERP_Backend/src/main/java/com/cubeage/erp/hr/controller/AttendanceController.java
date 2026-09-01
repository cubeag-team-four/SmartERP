package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.attendance.AttendanceRequest;
import com.cubeage.erp.hr.dto.attendance.AttendanceResponse;
import com.cubeage.erp.hr.service.AttendanceService;
import com.cubeage.erp.security.SecurityUtils;
import com.cubeage.erp.tenant.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

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
    public List<AttendanceResponse> getAttendance(
            @RequestParam(required = false) Long tenantId
    ) {
        return attendanceService.getAttendanceRecords(resolveTenantId(tenantId));
    }

    @PostMapping
    public ResponseEntity<AttendanceResponse> logAttendance(
            @RequestParam(required = false) Long tenantId,
            @RequestBody AttendanceRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(attendanceService.logAttendance(resolveTenantId(tenantId), request));
    }
}
