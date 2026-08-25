package com.cubeage.erp.inventory.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateInventoryItemRequest(
	@Size(max = 150) String name,
	@Size(max = 80) String category,
	@Size(max = 30) String warehouseCode,
	@Size(max = 100) String warehouseName,
	@DecimalMin("0") BigDecimal quantity,
	@DecimalMin("0") BigDecimal minimumLevel,
	@Size(max = 20) String unit,
	@DecimalMin("0") BigDecimal costPrice) {
}
