package com.cubeage.erp.purchase.repository;

import com.cubeage.erp.purchase.entity.PurchaseOrder;
import com.cubeage.erp.purchase.enums.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    List<PurchaseOrder> findByTenantIdOrderByCreatedAtDesc(Long tenantId);

    Optional<PurchaseOrder> findByIdAndTenantId(Long id, Long tenantId);

    List<PurchaseOrder> findByTenantIdAndOrderDateBetween(Long tenantId, LocalDate from, LocalDate to);

    long countByTenantIdAndStatus(Long tenantId, PurchaseOrderStatus status);

    @Query("select coalesce(sum(po.totalAmount), 0) from PurchaseOrder po " +
            "where po.tenantId = :tenantId and po.status <> com.cubeage.erp.purchase.enums.PurchaseOrderStatus.CANCELLED " +
            "and po.orderDate between :from and :to")
    BigDecimal sumPurchaseAmountBetween(
            @Param("tenantId") Long tenantId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
