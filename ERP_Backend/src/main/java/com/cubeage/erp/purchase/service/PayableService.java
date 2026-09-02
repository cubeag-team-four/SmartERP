package com.cubeage.erp.purchase.service;

import com.cubeage.erp.common.exception.BadRequestException;
import com.cubeage.erp.common.exception.ResourceNotFoundException;
import com.cubeage.erp.purchase.dto.payable.PayableResponse;
import com.cubeage.erp.purchase.dto.payable.PayableSummaryResponse;
import com.cubeage.erp.purchase.dto.payable.RecordPaymentRequest;
import com.cubeage.erp.purchase.entity.Payable;
import com.cubeage.erp.purchase.enums.PaymentStatus;
import com.cubeage.erp.purchase.mapper.PayableMapper;
import com.cubeage.erp.purchase.repository.PayableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PayableService {

    private final PayableRepository payableRepository;
    private final PayableMapper mapper;

    @Transactional(readOnly = true)
    public List<PayableResponse> listPayables(Long tenantId) {
        return payableRepository.findByTenantIdOrderByDueDateAsc(tenantId)
                .stream()
                .map(p -> mapper.toResponse(markOverdue(p)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PayableResponse getPayable(Long tenantId, Long id) {
        return mapper.toResponse(markOverdue(requirePayable(tenantId, id)));
    }

    @Transactional(readOnly = true)
    public PayableSummaryResponse getSummary(Long tenantId) {
        BigDecimal totalOutstanding = payableRepository.totalOutstandingPayables(tenantId);
        BigDecimal totalOverdue = payableRepository.totalOverduePayables(tenantId);

        LocalDate today = LocalDate.now();
        LocalDate weekEnd = today.plusDays(7);
        BigDecimal dueThisWeek = payableRepository
                .findByTenantIdAndStatusIn(tenantId, List.of(PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID))
                .stream()
                .filter(p -> !p.getDueDate().isBefore(today) && !p.getDueDate().isAfter(weekEnd))
                .map(Payable::getBalanceDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingCount = payableRepository
                .findByTenantIdAndStatusIn(tenantId, List.of(PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID, PaymentStatus.OVERDUE))
                .size();

        return new PayableSummaryResponse(
                money(totalOutstanding),
                money(totalOverdue),
                money(dueThisWeek),
                pendingCount,
                "INR"
        );
    }

    public PayableResponse recordPayment(Long tenantId, Long id, RecordPaymentRequest request) {
        Payable payable = markOverdue(requirePayable(tenantId, id));

        if (payable.getStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("Payable is already fully paid");
        }
        BigDecimal amount = money(request.amount());
        if (amount.compareTo(payable.getBalanceDue()) > 0) {
            throw new BadRequestException("Payment amount exceeds outstanding balance");
        }
        if (payableRepository.existsByTenantIdAndInvoiceReference(tenantId, request.paymentReference())) {
            throw new BadRequestException("Payment reference already exists: " + request.paymentReference());
        }

        payable.setPaidAmount(money(payable.getPaidAmount().add(amount)));
        payable.setBalanceDue(money(payable.getTotalAmount().subtract(payable.getPaidAmount())));
        payable.setPaymentReference(request.paymentReference());
        payable.setPaidAt(request.paidAt() != null ? request.paidAt() : Instant.now());
        payable.setNotes(request.notes());
        payable.setStatus(payable.getBalanceDue().signum() == 0
                ? PaymentStatus.PAID
                : PaymentStatus.PARTIALLY_PAID);

        return mapper.toResponse(payableRepository.save(payable));
    }

    private Payable markOverdue(Payable payable) {
        if ((payable.getStatus() == PaymentStatus.UNPAID
                || payable.getStatus() == PaymentStatus.PARTIALLY_PAID)
                && payable.getDueDate().isBefore(LocalDate.now())
                && payable.getBalanceDue().signum() > 0) {
            payable.setStatus(PaymentStatus.OVERDUE);
            return payableRepository.save(payable);
        }
        return payable;
    }

    private Payable requirePayable(Long tenantId, Long id) {
        return payableRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payable not found: " + id));
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}