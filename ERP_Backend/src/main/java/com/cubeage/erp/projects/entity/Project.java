package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import com.cubeage.erp.projects.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name = "projects", uniqueConstraints = @UniqueConstraint(name = "uk_project_tenant_code", columnNames = {"tenant_id", "code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project extends BaseEntity {
    @Column(name = "tenant_id", nullable = false) private Long tenantId;
    @Column(nullable = false, length = 40) private String code;
    @Column(nullable = false, length = 160) private String name;
    @Column(length = 4000) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private ProjectStatus status;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ProjectPriority priority;
    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(name = "end_date", nullable = false) private LocalDate endDate;
    @Column(name = "manager_id", nullable = false) private Long managerId;
    @Column(name = "planned_budget", precision = 19, scale = 2) private BigDecimal plannedBudget;
    @Column(length = 3) private String currency;
    @Column(name = "progress_percent", nullable = false) private Integer progressPercent;
}
