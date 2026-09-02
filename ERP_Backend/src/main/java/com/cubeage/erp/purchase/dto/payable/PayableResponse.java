package com.cubeage.erp.purchase.dto.payable;

import com.cubeage.erp.purchase.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record PayableResponse(
        Long id,
        Long tenantId,
        Long purchaseOrderId,
        Long vendorId,
        String vendorName,
        String invoiceReference,
        LocalDate invoiceDate,
        LocalDate dueDate,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal balanceDue,
        PaymentStatus status,
        String paymentReference,
        Instant paidAt,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}