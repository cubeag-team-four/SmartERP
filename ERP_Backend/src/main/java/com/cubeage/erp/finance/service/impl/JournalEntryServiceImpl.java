package com.cubeage.erp.finance.service.impl;

import com.cubeage.erp.finance.dto.journal.*;
import com.cubeage.erp.finance.entity.*;
import com.cubeage.erp.finance.enums.JournalStatus;
import com.cubeage.erp.finance.exception.UnbalancedJournalException;
import com.cubeage.erp.finance.repository.JournalEntryRepository;
import com.cubeage.erp.finance.service.JournalEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service @RequiredArgsConstructor @Transactional
public class JournalEntryServiceImpl implements JournalEntryService {
    private final JournalEntryRepository repository;

    @Override
    public JournalEntryResponse create(Long tenantId, CreateJournalEntryRequest request) {
        BigDecimal debit = request.lines().stream().map(JournalEntryLineRequest::debit).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal credit = request.lines().stream().map(JournalEntryLineRequest::credit).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (debit.compareTo(credit) != 0 || debit.signum() == 0) throw new UnbalancedJournalException("Journal entry debit and credit totals must be equal and greater than zero");
        JournalEntry entry = JournalEntry.builder().tenantId(tenantId).entryNumber("JV-" + System.currentTimeMillis())
                .entryDate(request.entryDate()).description(request.description().trim()).reference(request.reference())
                .status(JournalStatus.POSTED).build();
        request.lines().forEach(line -> entry.getLines().add(JournalEntryLine.builder().journalEntry(entry)
                .accountCode(line.accountCode().trim()).accountName(line.accountName().trim()).debit(line.debit()).credit(line.credit()).build()));
        return response(repository.save(entry));
    }

    @Override @Transactional(readOnly = true)
    public List<JournalEntryResponse> all(Long tenantId) { return repository.findByTenantIdOrderByEntryDateDescIdDesc(tenantId).stream().map(this::response).toList(); }

    private JournalEntryResponse response(JournalEntry entry) {
        List<JournalEntryLineRequest> lines = entry.getLines().stream().map(line -> new JournalEntryLineRequest(line.getAccountCode(), line.getAccountName(), line.getDebit(), line.getCredit())).toList();
        BigDecimal debit = lines.stream().map(JournalEntryLineRequest::debit).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal credit = lines.stream().map(JournalEntryLineRequest::credit).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new JournalEntryResponse(entry.getId(), entry.getEntryNumber(), entry.getEntryDate(), entry.getDescription(), entry.getReference(), entry.getStatus().name(), debit, credit, lines);
    }
}
