package com.cubeage.erp.inventory.dto.response;

import java.math.BigDecimal;

public record InventoryItemResponse(
	Long id, String sku, String name, String category, String warehouseCode,
	String warehouseName, BigDecimal quantity, BigDecimal minimumLevel,
	String unit, BigDecimal costPrice, BigDecimal stockValue, String status) {
}
