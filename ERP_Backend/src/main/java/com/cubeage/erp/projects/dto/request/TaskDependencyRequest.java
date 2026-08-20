package com.cubeage.erp.projects.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class TaskDependencyRequest {
    @NotNull private Long taskId;
    @NotNull private Long dependsOnTaskId;
}
