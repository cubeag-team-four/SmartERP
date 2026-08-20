package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.TaskPriority;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateTaskRequest {
    @NotNull private Long projectId;
    private Long milestoneId;
    private Long parentTaskId;
    @NotBlank @Size(max = 200) private String title;
    @Size(max = 4000) private String description;
    @NotNull private TaskPriority priority;
    private Long assigneeId;
    private LocalDate startDate;
    private LocalDate dueDate;
    @PositiveOrZero private BigDecimal estimatedHours;
}
