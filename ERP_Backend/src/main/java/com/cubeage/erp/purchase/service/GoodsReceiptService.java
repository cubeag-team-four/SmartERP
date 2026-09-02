package com.cubeage.erp.purchase.service;

import com.cubeage.erp.common.exception.BadRequestException;
import com.cubeage.erp.common.exception.ResourceNotFoundException;
import com.cubeage.erp.purchase.dto.grn.CreateGoodsReceiptRequest;
import com.cubeage.erp.purchase.dto.grn.GoodsReceiptItemRequest;
import com.cubeage.erp.purchase.dto.grn.GoodsReceiptResponse;
import com.cubeage.erp.purchase.entity.GoodsReceipt;
import com.cubeage.erp.purchase.entity.GoodsReceiptItem;
import com.cubeage.erp.purchase.enums.GRNStatus;
import com.cubeage.erp.purchase.enums.QualityStatus;
import com.cubeage.erp.purchase.mapper.GoodsReceiptMapper;
import com.cubeage.erp.purchase.repository.GoodsReceiptRepository;
import com.cubeage.erp.purchase.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Year;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class GoodsReceiptService {

    private final GoodsReceiptRepository grnRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final GoodsReceiptMapper mapper;

    public GoodsReceiptResponse createGoodsReceipt(Long tenantId, CreateGoodsReceiptRequest request) {
        // Verify the Purchase Order exists and belongs to the tenant
        purchaseOrderRepository.findByIdAndTenantId(request.purchaseOrderId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Purchase order not found: " + request.purchaseOrderId()));

        String grnNumber = generateGrnNumber(tenantId);

        GoodsReceipt grn = GoodsReceipt.builder()
                .tenantId(tenantId)
                .grnNumber(grnNumber)
                .purchaseOrderId(request.purchaseOrderId())
                .vendorId(request.vendorId())
                .vendorName(request.vendorName().trim())
                .receivedDate(request.receivedDate())
                .status(GRNStatus.RECEIVED)
                .qualityStatus(request.qualityStatus() != null ? request.qualityStatus() : QualityStatus.ACCEPTED)
                .notes(request.notes())
                .totalValue(BigDecimal.ZERO)
                .build();

        BigDecimal totalValue = BigDecimal.ZERO;
        for (GoodsReceiptItemRequest itemReq : request.items()) {
            BigDecimal lineTotal = money(itemReq.receivedQuantity().multiply(itemReq.unitPrice()));
            totalValue = totalValue.add(lineTotal);
            grn.addItem(GoodsReceiptItem.builder()
                    .purchaseOrderItemId(itemReq.purchaseOrderItemId())
                    .productId(itemReq.productId())
                    .description(itemReq.description().trim())
                    .orderedQuantity(itemReq.orderedQuantity())
                    .receivedQuantity(itemReq.receivedQuantity())
                    .unitPrice(money(itemReq.unitPrice()))
                    .lineTotal(lineTotal)
                    .build());
        }
        grn.setTotalValue(money(totalValue));

        return mapper.toResponse(grnRepository.save(grn));
    }

    @Transactional(readOnly = true)
    public List<GoodsReceiptResponse> listGoodsReceipts(Long tenantId) {
        return grnRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GoodsReceiptResponse getGoodsReceipt(Long tenantId, Long id) {
        return mapper.toResponse(requireGrn(tenantId, id));
    }

    private String generateGrnNumber(Long tenantId) {
        int year = Year.now().getValue();
        long count = grnRepository.count();
        return "GRN-%d-%04d".formatted(year, count + 1);
    }

    private GoodsReceipt requireGrn(Long tenantId, Long id) {
        return grnRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Goods receipt not found: " + id));
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}