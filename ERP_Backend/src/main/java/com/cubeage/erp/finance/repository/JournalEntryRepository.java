package com.cubeage.erp.finance.repository;

import com.cubeage.erp.finance.entity.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
	List<JournalEntry> findByTenantIdOrderByEntryDateDescIdDesc(Long tenantId);
	long countByTenantId(Long tenantId);
}
