package com.cubeage.erp.inventory.service.impl;

import com.cubeage.erp.inventory.dto.request.*;
import com.cubeage.erp.inventory.dto.response.InventoryItemResponse;
import com.cubeage.erp.inventory.entity.InventoryItem;
import com.cubeage.erp.inventory.repository.InventoryItemRepository;
import com.cubeage.erp.inventory.service.InventoryItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryItemServiceImpl implements InventoryItemService {
	private final InventoryItemRepository repository;

	@Override
	public InventoryItemResponse create(Long tenantId, CreateInventoryItemRequest request) {
		if (repository.findByTenantIdAndSkuIgnoreCase(tenantId, request.sku().trim()).isPresent()) {
			throw new IllegalArgumentException("SKU already exists: " + request.sku());
		}
		InventoryItem item = InventoryItem.builder().tenantId(tenantId).sku(request.sku().trim().toUpperCase(Locale.ROOT))
				.name(request.name().trim()).category(request.category().trim()).warehouseCode(request.warehouseCode().trim())
				.warehouseName(request.warehouseName().trim()).quantity(request.quantity()).minimumLevel(request.minimumLevel())
				.unit(request.unit().trim()).costPrice(request.costPrice()).build();
		return response(repository.save(item));
	}

	@Override
	public InventoryItemResponse update(Long tenantId, Long id, UpdateInventoryItemRequest request) {
		InventoryItem item = entity(tenantId, id);
		if (request.name() != null) item.setName(request.name().trim());
		if (request.category() != null) item.setCategory(request.category().trim());
		if (request.warehouseCode() != null) item.setWarehouseCode(request.warehouseCode().trim());
		if (request.warehouseName() != null) item.setWarehouseName(request.warehouseName().trim());
		if (request.quantity() != null) item.setQuantity(request.quantity());
		if (request.minimumLevel() != null) item.setMinimumLevel(request.minimumLevel());
		if (request.unit() != null) item.setUnit(request.unit().trim());
		if (request.costPrice() != null) item.setCostPrice(request.costPrice());
		return response(repository.save(item));
	}

	@Override @Transactional(readOnly = true)
	public InventoryItemResponse get(Long tenantId, Long id) { return response(entity(tenantId, id)); }

	@Override @Transactional(readOnly = true)
	public List<InventoryItemResponse> all(Long tenantId, String search, String status) {
		String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
		String requestedStatus = status == null ? "" : status.trim().replace(' ', '_').toUpperCase(Locale.ROOT);
		return repository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
				.filter(item -> term.isBlank() || item.getSku().toLowerCase(Locale.ROOT).contains(term)
						|| item.getName().toLowerCase(Locale.ROOT).contains(term)
						|| item.getCategory().toLowerCase(Locale.ROOT).contains(term)
						|| item.getWarehouseName().toLowerCase(Locale.ROOT).contains(term))
				.filter(item -> requestedStatus.isBlank() || status(item).name().equals(requestedStatus))
				.map(this::response).toList();
	}

	@Override
	public void delete(Long tenantId, Long id) { repository.delete(entity(tenantId, id)); }

	private InventoryItem entity(Long tenantId, Long id) {
		return repository.findByIdAndTenantId(id, tenantId)
				.orElseThrow(() -> new IllegalArgumentException("Inventory item not found: " + id));
	}

	private InventoryItemResponse response(InventoryItem item) {
		return new InventoryItemResponse(item.getId(), item.getSku(), item.getName(), item.getCategory(), item.getWarehouseCode(),
				item.getWarehouseName(), item.getQuantity(), item.getMinimumLevel(), item.getUnit(), item.getCostPrice(),
				item.getQuantity().multiply(item.getCostPrice()), status(item).name().replace('_', ' '));
	}

	private com.cubeage.erp.inventory.enums.InventoryItemStatus status(InventoryItem item) {
		if (item.getQuantity().signum() == 0) return com.cubeage.erp.inventory.enums.InventoryItemStatus.OUT_OF_STOCK;
		if (item.getQuantity().compareTo(item.getMinimumLevel()) < 0) return com.cubeage.erp.inventory.enums.InventoryItemStatus.LOW_STOCK;
		return com.cubeage.erp.inventory.enums.InventoryItemStatus.IN_STOCK;
	}
}
