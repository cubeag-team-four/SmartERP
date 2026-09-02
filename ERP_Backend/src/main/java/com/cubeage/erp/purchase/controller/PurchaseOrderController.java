package com.cubeage.erp.purchase.controller;

import com.cubeage.erp.purchase.dto.purchaseorder.CreatePurchaseOrderRequest;
import com.cubeage.erp.purchase.dto.purchaseorder.PurchaseOrderResponse;
import com.cubeage.erp.purchase.dto.purchaseorder.UpdatePurchaseOrderRequest;
import com.cubeage.erp.purchase.service.PurchaseOrderService;
import com.cubeage.erp.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase/orders")
@RequiredArgsConstructor
@PreAuthorize("@permissionEvaluator.has(authentication,'PURCHASE','VIEW')")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    public List<PurchaseOrderResponse> listPurchaseOrders() {
        return purchaseOrderService.listPurchaseOrders(SecurityUtils.currentTenantId());
    }

    @GetMapping("/{id}")
    public PurchaseOrderResponse getPurchaseOrder(@PathVariable Long id) {
        return purchaseOrderService.getPurchaseOrder(SecurityUtils.currentTenantId(), id);
    }

    @PostMapping
    @PreAuthorize("@permissionEvaluator.has(authentication,'PURCHASE','CREATE')")
    public ResponseEntity<PurchaseOrderResponse> createPurchaseOrder(
            @Valid @RequestBody CreatePurchaseOrderRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(purchaseOrderService.createPurchaseOrder(SecurityUtils.currentTenantId(), request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionEvaluator.has(authentication,'PURCHASE','EDIT')")
    public PurchaseOrderResponse updatePurchaseOrder(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePurchaseOrderRequest request
    ) {
        return purchaseOrderService.updatePurchaseOrder(SecurityUtils.currentTenantId(), id, request);
    }
}