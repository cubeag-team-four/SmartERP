package com.cubeage.erp.hr.controller;

import com.cubeage.erp.hr.dto.performance.DepartmentScoreResponse;
import com.cubeage.erp.hr.dto.performance.PerformanceReviewRequest;
import com.cubeage.erp.hr.dto.performance.PerformanceReviewResponse;
import com.cubeage.erp.hr.dto.performance.PerformanceSummaryResponse;
import com.cubeage.erp.hr.service.PerformanceService;
import com.cubeage.erp.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/performance")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','TENANT_ADMIN','HR_MANAGER')")
@RequiredArgsConstructor
public class PerformanceController {

    private final PerformanceService performanceService;

    /** Tenant is always taken from the authenticated principal, never from the request. */
    private Long currentTenantId() {
        return SecurityUtils.currentTenantId();
    }

    @GetMapping
    public PerformanceSummaryResponse getPerformance() {
        return performanceService.getSummary(currentTenantId());
    }

    @GetMapping("/summary")
    public PerformanceSummaryResponse getSummary() {
        return performanceService.getSummary(currentTenantId());
    }

    @GetMapping("/reviews")
    public List<PerformanceReviewResponse> getReviews() {
        return performanceService.getReviews(currentTenantId());
    }

    @GetMapping("/department-scores")
    public List<DepartmentScoreResponse> getDepartmentScores() {
        return performanceService.getDepartmentScores(currentTenantId());
    }

    @PostMapping("/reviews")
    public ResponseEntity<PerformanceReviewResponse> addReview(
            @RequestBody PerformanceReviewRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(performanceService.addReview(currentTenantId(), request));
    }
}
