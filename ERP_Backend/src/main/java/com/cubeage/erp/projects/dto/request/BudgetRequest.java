package com.cubeage.erp.projects.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class BudgetRequest {
    @NotNull private Long projectId;
    @NotNull @PositiveOrZero private BigDecimal amount;
    @NotBlank @Size(max = 3) private String currency;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal alertThresholdPercent;
}
