package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import com.cubeage.erp.projects.enums.TimesheetStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity @Table(name = "project_timesheets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Timesheet extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(name = "task_id") private Long taskId;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "work_date", nullable = false) private LocalDate workDate;
    @Column(nullable = false, precision = 6, scale = 2) private BigDecimal hours;
    @Column(length = 2000) private String notes;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TimesheetStatus status;
    @Column(name = "decided_by") private Long decidedBy;
    @Column(name = "decided_at") private LocalDateTime decidedAt;
    @Column(name = "decision_comment", length = 1000) private String decisionComment;
}
