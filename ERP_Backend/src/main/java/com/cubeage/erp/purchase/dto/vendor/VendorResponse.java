package com.cubeage.erp.purchase.dto.vendor;

import com.cubeage.erp.purchase.enums.VendorStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record VendorResponse(
        Long id,
        Long tenantId,
        String vendorCode,
        String vendorName,
        String contactName,
        String phone,
        String email,
        String city,
        String address,
        String category,
        String gstin,
        String pan,
        String paymentTerms,
        BigDecimal creditLimit,
        BigDecimal rating,
        VendorStatus status,
        Instant createdAt,
        Instant updatedAt
) {}
