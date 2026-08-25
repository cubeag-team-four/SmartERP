package com.cubeage.erp.finance.service;

import com.cubeage.erp.finance.dto.journal.CreateJournalEntryRequest;
import com.cubeage.erp.finance.dto.journal.JournalEntryResponse;
import java.util.List;

public interface JournalEntryService {
	JournalEntryResponse create(Long tenantId, CreateJournalEntryRequest request);
	List<JournalEntryResponse> all(Long tenantId);
}
