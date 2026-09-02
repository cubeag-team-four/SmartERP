package com.cubeage.erp.purchase.service;

import com.cubeage.erp.common.exception.BadRequestException;
import com.cubeage.erp.common.exception.ResourceNotFoundException;
import com.cubeage.erp.purchase.dto.vendor.VendorRequest;
import com.cubeage.erp.purchase.dto.vendor.VendorResponse;
import com.cubeage.erp.purchase.dto.vendor.VendorSummaryResponse;
import com.cubeage.erp.purchase.entity.Vendor;
import com.cubeage.erp.purchase.enums.VendorStatus;
import com.cubeage.erp.purchase.mapper.VendorMapper;
import com.cubeage.erp.purchase.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class VendorService {

    private final VendorRepository vendorRepository;
    private final VendorMapper vendorMapper;

    public VendorResponse createVendor(Long tenantId, VendorRequest request) {
        String vendorCode = generateVendorCode(tenantId);
        if (vendorRepository.existsByTenantIdAndVendorCode(tenantId, vendorCode)) {
            throw new BadRequestException("Vendor code already exists: " + vendorCode);
        }
        Vendor vendor = Vendor.builder()
                .tenantId(tenantId)
                .vendorCode(vendorCode)
                .vendorName(request.vendorName().trim())
                .contactName(request.contactName().trim())
                .phone(request.phone())
                .email(request.email())
                .city(request.city())
                .address(request.address())
                .category(request.category())
                .gstin(request.gstin())
                .pan(request.pan())
                .paymentTerms(request.paymentTerms())
                .creditLimit(request.creditLimit() != null ? request.creditLimit() : BigDecimal.ZERO)
                .rating(request.rating() != null ? request.rating() : BigDecimal.ZERO)
                .status(request.status() != null ? request.status() : VendorStatus.ACTIVE)
                .build();
        return vendorMapper.toResponse(vendorRepository.save(vendor));
    }

    @Transactional(readOnly = true)
    public List<VendorSummaryResponse> listVendors(Long tenantId) {
        return vendorRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(vendorMapper::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public VendorResponse getVendor(Long tenantId, Long id) {
        return vendorMapper.toResponse(requireVendor(tenantId, id));
    }

    public VendorResponse updateVendor(Long tenantId, Long id, VendorRequest request) {
        Vendor vendor = requireVendor(tenantId, id);
        if (request.vendorName() != null) vendor.setVendorName(request.vendorName().trim());
        if (request.contactName() != null) vendor.setContactName(request.contactName().trim());
        if (request.phone() != null) vendor.setPhone(request.phone());
        if (request.email() != null) vendor.setEmail(request.email());
        if (request.city() != null) vendor.setCity(request.city());
        if (request.address() != null) vendor.setAddress(request.address());
        if (request.category() != null) vendor.setCategory(request.category());
        if (request.gstin() != null) vendor.setGstin(request.gstin());
        if (request.pan() != null) vendor.setPan(request.pan());
        if (request.paymentTerms() != null) vendor.setPaymentTerms(request.paymentTerms());
        if (request.creditLimit() != null) vendor.setCreditLimit(request.creditLimit());
        if (request.rating() != null) vendor.setRating(request.rating());
        if (request.status() != null) vendor.setStatus(request.status());
        return vendorMapper.toResponse(vendorRepository.save(vendor));
    }

    private String generateVendorCode(Long tenantId) {
        long count = vendorRepository.countByTenantIdAndStatus(tenantId, VendorStatus.ACTIVE)
                + vendorRepository.countByTenantIdAndStatus(tenantId, VendorStatus.INACTIVE);
        return "V-%04d".formatted(count + 1);
    }

    private Vendor requireVendor(Long tenantId, Long id) {
        return vendorRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + id));
    }
}