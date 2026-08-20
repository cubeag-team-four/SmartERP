package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateTaskRequest {
    @Size(max = 200) private String title;
    @Size(max = 4000) private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private Long milestoneId;
    private Long assigneeId;
    private LocalDate startDate;
    private LocalDate dueDate;
    @PositiveOrZero private BigDecimal estimatedHours;
    @PositiveOrZero private BigDecimal actualHours;
    @Min(0) @Max(100) private Integer progressPercent;
}
