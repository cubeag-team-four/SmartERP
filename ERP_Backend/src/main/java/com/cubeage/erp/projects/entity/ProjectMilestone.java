package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import com.cubeage.erp.projects.enums.MilestoneStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Table(name = "project_milestones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectMilestone extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(nullable = false, length = 160) private String name;
    @Column(length = 2000) private String description;
    @Column(name = "due_date", nullable = false) private LocalDate dueDate;
    @Column(name = "completed_date") private LocalDate completedDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private MilestoneStatus status;
}
