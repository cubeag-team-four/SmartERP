package com.cubeage.erp.purchase.controller;

import com.cubeage.erp.purchase.dto.payable.PayableResponse;
import com.cubeage.erp.purchase.dto.payable.PayableSummaryResponse;
import com.cubeage.erp.purchase.dto.payable.RecordPaymentRequest;
import com.cubeage.erp.purchase.service.PayableService;
import com.cubeage.erp.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase/payables")
@RequiredArgsConstructor
@PreAuthorize("@permissionEvaluator.has(authentication,'PURCHASE','VIEW')")
public class PayableController {

    private final PayableService payableService;

    @GetMapping
    public List<PayableResponse> listPayables() {
        return payableService.listPayables(SecurityUtils.currentTenantId());
    }

    @GetMapping("/summary")
    public PayableSummaryResponse getSummary() {
        return payableService.getSummary(SecurityUtils.currentTenantId());
    }

    @GetMapping("/{id}")
    public PayableResponse getPayable(@PathVariable Long id) {
        return payableService.getPayable(SecurityUtils.currentTenantId(), id);
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("@permissionEvaluator.has(authentication,'PURCHASE','EDIT')")
    public PayableResponse recordPayment(
            @PathVariable Long id,
            @Valid @RequestBody RecordPaymentRequest request
    ) {
        return payableService.recordPayment(SecurityUtils.currentTenantId(), id, request);
    }
}