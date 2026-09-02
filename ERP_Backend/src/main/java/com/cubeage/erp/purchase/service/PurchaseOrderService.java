package com.cubeage.erp.purchase.service;

import com.cubeage.erp.common.exception.BadRequestException;
import com.cubeage.erp.common.exception.ResourceNotFoundException;
import com.cubeage.erp.purchase.dto.purchaseorder.*;
import com.cubeage.erp.purchase.entity.PurchaseOrder;
import com.cubeage.erp.purchase.entity.PurchaseOrderItem;
import com.cubeage.erp.purchase.enums.PurchaseOrderStatus;
import com.cubeage.erp.purchase.mapper.PurchaseOrderMapper;
import com.cubeage.erp.purchase.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PurchaseOrderService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderMapper mapper;

    public PurchaseOrderResponse createPurchaseOrder(Long tenantId, CreatePurchaseOrderRequest request) {
        String orderNumber = generateOrderNumber(tenantId);

        PurchaseOrder order = PurchaseOrder.builder()
                .tenantId(tenantId)
                .orderNumber(orderNumber)
                .vendorId(request.vendorId())
                .vendorName(request.vendorName().trim())
                .status(PurchaseOrderStatus.DRAFT)
                .orderDate(LocalDate.now())
                .expectedDeliveryDate(request.expectedDeliveryDate())
                .deliveryLocation(request.deliveryLocation())
                .paymentTerms(request.paymentTerms())
                .notes(request.notes())
                .subtotal(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();

        applyItems(order, request.items());
        return mapper.toResponse(purchaseOrderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> listPurchaseOrders(Long tenantId) {
        return purchaseOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse getPurchaseOrder(Long tenantId, Long id) {
        return mapper.toResponse(requireOrder(tenantId, id));
    }

    public PurchaseOrderResponse updatePurchaseOrder(Long tenantId, Long id, UpdatePurchaseOrderRequest request) {
        PurchaseOrder order = requireOrder(tenantId, id);

        if (order.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new BadRequestException("Cancelled purchase order cannot be edited");
        }
        if (request.status() != null) {
            validateStatusTransition(order.getStatus(), request.status());
            order.setStatus(request.status());
        }
        if (request.expectedDeliveryDate() != null) order.setExpectedDeliveryDate(request.expectedDeliveryDate());
        if (request.actualDeliveryDate() != null) {
            if (request.actualDeliveryDate().isBefore(order.getOrderDate())) {
                throw new BadRequestException("Actual delivery date cannot be before order date");
            }
            order.setActualDeliveryDate(request.actualDeliveryDate());
        }
        if (request.deliveryLocation() != null) order.setDeliveryLocation(request.deliveryLocation());
        if (request.paymentTerms() != null) order.setPaymentTerms(request.paymentTerms());
        if (request.notes() != null) order.setNotes(request.notes());
        if (request.items() != null && !request.items().isEmpty()) {
            applyItems(order, request.items());
        }
        return mapper.toResponse(purchaseOrderRepository.save(order));
    }

    private void applyItems(PurchaseOrder order, List<PurchaseOrderItemRequest> requestedItems) {
        List<PurchaseOrderItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        for (PurchaseOrderItemRequest req : requestedItems) {
            BigDecimal net = money(req.quantity().multiply(req.unitPrice()));
            BigDecimal lineTax = money(net.multiply(req.taxRate()).divide(HUNDRED, 4, RoundingMode.HALF_UP));
            subtotal = subtotal.add(net);
            totalTax = totalTax.add(lineTax);
            items.add(PurchaseOrderItem.builder()
                    .productId(req.productId())
                    .description(req.description().trim())
                    .quantity(req.quantity())
                    .unitPrice(money(req.unitPrice()))
                    .taxRate(req.taxRate())
                    .lineTotal(money(net.add(lineTax)))
                    .build());
        }
        order.replaceItems(items);
        order.setSubtotal(money(subtotal));
        order.setTaxAmount(money(totalTax));
        order.setTotalAmount(money(subtotal.add(totalTax)));
    }

    private void validateStatusTransition(PurchaseOrderStatus current, PurchaseOrderStatus requested) {
        if (current == requested) return;
        boolean valid = switch (current) {
            case DRAFT -> requested == PurchaseOrderStatus.SENT || requested == PurchaseOrderStatus.CANCELLED;
            case SENT -> requested == PurchaseOrderStatus.CONFIRMED || requested == PurchaseOrderStatus.CANCELLED;
            case CONFIRMED -> requested == PurchaseOrderStatus.IN_PROGRESS || requested == PurchaseOrderStatus.CANCELLED;
            case IN_PROGRESS -> requested == PurchaseOrderStatus.COMPLETED || requested == PurchaseOrderStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
        if (!valid) {
            throw new BadRequestException(
                    "Invalid purchase order status transition: " + current + " -> " + requested);
        }
    }

    private String generateOrderNumber(Long tenantId) {
        int year = Year.now().getValue();
        long count = purchaseOrderRepository.count();
        return "PO-%d-%04d".formatted(year, count + 1);
    }

    private PurchaseOrder requireOrder(Long tenantId, Long id) {
        return purchaseOrderRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found: " + id));
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}