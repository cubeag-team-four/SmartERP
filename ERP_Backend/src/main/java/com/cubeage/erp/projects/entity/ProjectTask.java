package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import com.cubeage.erp.projects.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name = "project_tasks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectTask extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(name = "milestone_id") private Long milestoneId;
    @Column(name = "parent_task_id") private Long parentTaskId;
    @Column(nullable = false, length = 200) private String title;
    @Column(length = 4000) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private TaskStatus status;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TaskPriority priority;
    @Column(name = "assignee_id") private Long assigneeId;
    @Column(name = "start_date") private LocalDate startDate;
    @Column(name = "due_date") private LocalDate dueDate;
    @Column(name = "estimated_hours", precision = 10, scale = 2) private BigDecimal estimatedHours;
    @Column(name = "actual_hours", precision = 10, scale = 2) private BigDecimal actualHours;
    @Column(name = "progress_percent", nullable = false) private Integer progressPercent;
}
