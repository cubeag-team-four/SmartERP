package com.cubeage.erp.projects.dto.response;

import com.cubeage.erp.projects.enums.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProjectResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private ProjectStatus status;
    private ProjectPriority priority;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long managerId;
    private BigDecimal plannedBudget;
    private String currency;
    private Integer progressPercent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
