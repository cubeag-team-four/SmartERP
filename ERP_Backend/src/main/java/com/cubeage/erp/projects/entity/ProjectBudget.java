package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "project_budgets", uniqueConstraints = @UniqueConstraint(name = "uk_project_budget", columnNames = "project_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectBudget extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal amount;
    @Column(nullable = false, length = 3) private String currency;
    @Column(name = "alert_threshold_percent", precision = 5, scale = 2) private BigDecimal alertThresholdPercent;
}
