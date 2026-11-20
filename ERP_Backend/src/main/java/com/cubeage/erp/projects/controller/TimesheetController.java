package com.cubeage.erp.projects.controller;

import com.cubeage.erp.projects.dto.request.CreateTimesheetRequest;
import com.cubeage.erp.projects.dto.response.TimesheetResponse;
import com.cubeage.erp.projects.service.TimesheetService;
import com.cubeage.erp.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/timesheets")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
/**
 * The acting user is always the authenticated principal. The former X-User-Id / X-User-Name
 * headers let any caller act or approve as another user and are no longer read.
 */
public class TimesheetController {

    private final TimesheetService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TimesheetResponse create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @Valid @RequestBody CreateTimesheetRequest request) {
        return service.create(tenantId, SecurityUtils.currentUserId(), SecurityUtils.currentUser().getName(), request);
    }

    @PostMapping("/{id}/submit")
    public TimesheetResponse submit(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long id) {
        return service.submit(tenantId, SecurityUtils.currentUserId(), id);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN','PROJECT_MANAGER')")
    public TimesheetResponse approve(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long id) {
        return service.approve(tenantId, SecurityUtils.currentUserId(), SecurityUtils.currentUser().getName(), id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN','PROJECT_MANAGER')")
    public TimesheetResponse reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long id) {
        return service.reject(tenantId, SecurityUtils.currentUserId(), SecurityUtils.currentUser().getName(), id);
    }

    @GetMapping("/my")
    public List<TimesheetResponse> my(
            @RequestHeader("X-Tenant-Id") Long tenantId) {
        return service.my(tenantId, SecurityUtils.currentUserId());
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('TENANT_ADMIN','PROJECT_MANAGER')")
    public List<TimesheetResponse> byProject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long projectId) {
        return service.project(tenantId, projectId);
    }
}
