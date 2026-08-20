package com.cubeage.erp.projects.dto.response;

import com.cubeage.erp.projects.enums.TimesheetStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TimesheetResponse {
    private Long id;
    private Long projectId;
    private Long taskId;
    private Long userId;
    private LocalDate workDate;
    private BigDecimal hours;
    private String notes;
    private TimesheetStatus status;
    private Long decidedBy;
    private LocalDateTime decidedAt;
    private String decisionComment;
}
