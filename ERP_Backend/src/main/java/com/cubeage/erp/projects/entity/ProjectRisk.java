package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import com.cubeage.erp.projects.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Table(name = "project_risks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectRisk extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(nullable = false, length = 200) private String title;
    @Column(length = 4000) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private RiskType type;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RiskLevel level;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RiskStatus status;
    @Column(name = "mitigation_plan", length = 4000) private String mitigationPlan;
    @Column(name = "owner_id") private Long ownerId;
    @Column(name = "target_resolution_date") private LocalDate targetResolutionDate;
}
