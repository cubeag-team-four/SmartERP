package com.cubeage.erp.purchase.dto.vendor;

import com.cubeage.erp.purchase.enums.VendorStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record VendorRequest(
        @NotBlank String vendorName,
        @NotBlank String contactName,
        String phone,
        @Email String email,
        String city,
        String address,
        String category,
        String gstin,
        String pan,
        String paymentTerms,
        @PositiveOrZero BigDecimal creditLimit,
        @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal rating,
        VendorStatus status
) {}
