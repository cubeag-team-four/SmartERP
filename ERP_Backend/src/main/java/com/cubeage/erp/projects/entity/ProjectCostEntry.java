package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import com.cubeage.erp.projects.enums.BudgetCostType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name = "project_cost_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectCostEntry extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(name = "budget_id") private Long budgetId;
    @Enumerated(EnumType.STRING) @Column(name = "cost_type", nullable = false, length = 30) private BudgetCostType costType;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal amount;
    @Column(name = "incurred_on", nullable = false) private LocalDate incurredOn;
    @Column(nullable = false, length = 500) private String description;
}
