package com.cubeage.erp.inventory.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreateInventoryItemRequest(
	@NotBlank @Size(max = 50) String sku,
	@NotBlank @Size(max = 150) String name,
	@NotBlank @Size(max = 80) String category,
	@NotBlank @Size(max = 30) String warehouseCode,
	@NotBlank @Size(max = 100) String warehouseName,
	@NotNull @DecimalMin("0") BigDecimal quantity,
	@NotNull @DecimalMin("0") BigDecimal minimumLevel,
	@NotBlank @Size(max = 20) String unit,
	@NotNull @DecimalMin("0") BigDecimal costPrice) {
}
