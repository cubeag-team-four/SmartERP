package com.cubeage.erp.manufacturing.service.impl;

import com.cubeage.erp.common.exception.ResourceNotFoundException;
import com.cubeage.erp.manufacturing.dto.request.CreateBomRequest;
import com.cubeage.erp.manufacturing.dto.request.UpdateBomRequest;
import com.cubeage.erp.manufacturing.dto.response.BomDetailsResponse;
import com.cubeage.erp.manufacturing.dto.response.BomResponse;
import com.cubeage.erp.manufacturing.entity.BillOfMaterial;
import com.cubeage.erp.manufacturing.entity.BomItem;
import com.cubeage.erp.manufacturing.mapper.BomMapper;
import com.cubeage.erp.manufacturing.repository.BillOfMaterialRepository;
import com.cubeage.erp.manufacturing.service.BomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BomServiceImpl implements BomService {

    private final BillOfMaterialRepository bomRepository;
    private final BomMapper mapper;

    @Override
    public BomResponse create(Long tenantId, CreateBomRequest request) {
        BigDecimal totalCost = request.items().stream()
                .map(i -> i.unitCost().multiply(i.quantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BillOfMaterial bom = BillOfMaterial.builder()
                .tenantId(tenantId)
                .bomNumber(generateBomNumber(tenantId))
                .productName(request.product().trim())
                .version(request.version().trim())
                .totalCost(totalCost)
                .notes(request.notes())
                .items(new ArrayList<>())
                .build();

        List<BomItem> items = request.items().stream()
                .map(item -> BomItem.builder()
                        .billOfMaterial(bom)
                        .productId(item.productId())
                        .description(item.description().trim())
                        .quantity(item.quantity())
                        .unitCost(item.unitCost())
                        .build())
                .toList();

        bom.getItems().addAll(items);
        return mapper.toResponse(bomRepository.save(bom));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BomResponse> getAll(Long tenantId) {
        return bomRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BomDetailsResponse getById(Long tenantId, Long id) {
        return mapper.toDetailsResponse(getEntity(tenantId, id));
    }

    @Override
    public BomResponse update(Long tenantId, Long id, UpdateBomRequest request) {
        BillOfMaterial bom = getEntity(tenantId, id);
        bom.setProductName(request.product().trim());
        bom.setVersion(request.version().trim());
        if (request.notes() != null) {
            bom.setNotes(request.notes());
        }
        return mapper.toResponse(bomRepository.save(bom));
    }

    @Override
    public void delete(Long tenantId, Long id) {
        BillOfMaterial bom = getEntity(tenantId, id);
        bomRepository.delete(bom);
    }

    private BillOfMaterial getEntity(Long tenantId, Long id) {
        return bomRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("BOM not found: " + id));
    }

    private synchronized String generateBomNumber(Long tenantId) {
        long count = bomRepository.countByTenantId(tenantId) + 1;
        return String.format("BOM-%03d", count);
    }
}