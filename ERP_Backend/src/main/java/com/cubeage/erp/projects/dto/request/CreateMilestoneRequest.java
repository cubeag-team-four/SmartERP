package com.cubeage.erp.projects.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateMilestoneRequest {
    @NotNull private Long projectId;
    @NotBlank @Size(max = 160) private String name;
    @Size(max = 2000) private String description;
    @NotNull private LocalDate dueDate;
}
