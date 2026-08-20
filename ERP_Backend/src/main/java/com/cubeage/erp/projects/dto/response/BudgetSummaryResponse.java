package com.cubeage.erp.projects.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BudgetSummaryResponse {
    private Long projectId;
    private BigDecimal budgetAmount;
    private BigDecimal spentAmount;
    private BigDecimal remainingAmount;
    private BigDecimal utilizationPercent;
    private String currency;
    private Map<String, BigDecimal> costByType;
}
