package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateProjectRequest {
    @Size(max = 160) private String name;
    @Size(max = 4000) private String description;
    private ProjectStatus status;
    private ProjectPriority priority;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long managerId;
    @PositiveOrZero private BigDecimal plannedBudget;
    @Size(max = 3) private String currency;
}
