package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.BudgetCostType;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CostEntryRequest {
    @NotNull private Long projectId;
    private Long budgetId;
    @NotNull private BudgetCostType costType;
    @NotNull @Positive private BigDecimal amount;
    @NotNull private LocalDate incurredOn;
    @NotBlank @Size(max = 500) private String description;
}
