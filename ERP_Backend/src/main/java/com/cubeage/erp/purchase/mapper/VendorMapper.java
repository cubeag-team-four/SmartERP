package com.cubeage.erp.purchase.mapper;

import com.cubeage.erp.purchase.dto.vendor.VendorResponse;
import com.cubeage.erp.purchase.dto.vendor.VendorSummaryResponse;
import com.cubeage.erp.purchase.entity.Vendor;
import org.springframework.stereotype.Component;

@Component
public class VendorMapper {

    public VendorResponse toResponse(Vendor v) {
        return new VendorResponse(
                v.getId(),
                v.getTenantId(),
                v.getVendorCode(),
                v.getVendorName(),
                v.getContactName(),
                v.getPhone(),
                v.getEmail(),
                v.getCity(),
                v.getAddress(),
                v.getCategory(),
                v.getGstin(),
                v.getPan(),
                v.getPaymentTerms(),
                v.getCreditLimit(),
                v.getRating(),
                v.getStatus(),
                v.getCreatedAt(),
                v.getUpdatedAt()
        );
    }

    public VendorSummaryResponse toSummary(Vendor v) {
        return new VendorSummaryResponse(
                v.getId(),
                v.getVendorCode(),
                v.getVendorName(),
                v.getContactName(),
                v.getCity(),
                v.getCategory(),
                v.getCreditLimit(),
                v.getRating(),
                v.getStatus()
        );
    }
}