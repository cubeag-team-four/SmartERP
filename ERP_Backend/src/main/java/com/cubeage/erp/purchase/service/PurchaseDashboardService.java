package com.cubeage.erp.purchase.service;

import com.cubeage.erp.purchase.dto.dashboard.PurchaseDashboardResponse;
import com.cubeage.erp.purchase.entity.GoodsReceipt;
import com.cubeage.erp.purchase.enums.PaymentStatus;
import com.cubeage.erp.purchase.enums.VendorStatus;
import com.cubeage.erp.purchase.repository.GoodsReceiptRepository;
import com.cubeage.erp.purchase.repository.PayableRepository;
import com.cubeage.erp.purchase.repository.PurchaseOrderRepository;
import com.cubeage.erp.purchase.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseDashboardService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final VendorRepository vendorRepository;
    private final PayableRepository payableRepository;
    private final GoodsReceiptRepository grnRepository;

    public PurchaseDashboardResponse getDashboard(Long tenantId) {
        LocalDate today = LocalDate.now();
        LocalDate currentMonthStart = today.withDayOfMonth(1);
        LocalDate previousMonthStart = currentMonthStart.minusMonths(1);
        LocalDate previousMonthEnd = currentMonthStart.minusDays(1);

        // Purchase MTD
        BigDecimal purchaseMtd = purchaseOrderRepository.sumPurchaseAmountBetween(
                tenantId, currentMonthStart, today);
        BigDecimal purchasePrev = purchaseOrderRepository.sumPurchaseAmountBetween(
                tenantId, previousMonthStart, previousMonthEnd);
        BigDecimal purchaseChange = percentageChange(purchaseMtd, purchasePrev);

        // Payables
        BigDecimal totalPayables = payableRepository.totalOutstandingPayables(tenantId);
        long pendingPayableCount = payableRepository
                .findByTenantIdAndStatusIn(tenantId,
                        List.of(PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID, PaymentStatus.OVERDUE))
                .size();

        // Active Vendors
        long activeVendorCount = vendorRepository.countByTenantIdAndStatus(tenantId, VendorStatus.ACTIVE);

        // On-Time Receipt
        List<GoodsReceipt> currentGrns = grnRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .filter(g -> !g.getReceivedDate().isBefore(currentMonthStart)
                        && !g.getReceivedDate().isAfter(today))
                .toList();
        List<GoodsReceipt> previousGrns = grnRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .filter(g -> !g.getReceivedDate().isBefore(previousMonthStart)
                        && !g.getReceivedDate().isAfter(previousMonthEnd))
                .toList();

        BigDecimal currentOnTime = onTimeReceiptPercentage(currentGrns, tenantId);
        BigDecimal previousOnTime = onTimeReceiptPercentage(previousGrns, tenantId);

        return new PurchaseDashboardResponse(
                money(purchaseMtd),
                money(purchaseChange),
                money(totalPayables),
                pendingPayableCount,
                activeVendorCount,
                money(currentOnTime),
                money(currentOnTime.subtract(previousOnTime)),
                "INR"
        );
    }

    private BigDecimal onTimeReceiptPercentage(List<GoodsReceipt> grns, Long tenantId) {
        if (grns.isEmpty()) return BigDecimal.ZERO;
        // On-time: received on or before expected delivery date of the PO
        long onTime = grns.stream()
                .filter(grn -> {
                    return purchaseOrderRepository.findByIdAndTenantId(grn.getPurchaseOrderId(), tenantId)
                            .map(po -> po.getExpectedDeliveryDate() == null
                                    || !grn.getReceivedDate().isAfter(po.getExpectedDeliveryDate()))
                            .orElse(false);
                })
                .count();
        return BigDecimal.valueOf(onTime)
                .multiply(HUNDRED)
                .divide(BigDecimal.valueOf(grns.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal percentageChange(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) {
            return current.signum() == 0 ? BigDecimal.ZERO : HUNDRED;
        }
        return current.subtract(previous)
                .multiply(HUNDRED)
                .divide(previous, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}