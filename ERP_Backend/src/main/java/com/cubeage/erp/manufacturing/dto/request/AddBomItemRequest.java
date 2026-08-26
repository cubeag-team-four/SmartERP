package com.cubeage.erp.manufacturing.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record AddBomItemRequest(
        Long productId,
        @NotBlank(message = "Description is required") String description,
        @NotNull(message = "Quantity is required") @Positive BigDecimal quantity,
        @NotNull(message = "Unit cost is required") @DecimalMin(value = "0.0", message = "Unit cost cannot be negative") BigDecimal unitCost
) {}
