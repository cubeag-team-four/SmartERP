package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.ProjectPriority;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateProjectRequest {
    @NotBlank @Size(max = 40) private String code;
    @NotBlank @Size(max = 160) private String name;
    @Size(max = 4000) private String description;
    @NotNull private ProjectPriority priority;
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
    @NotNull private Long managerId;
    @PositiveOrZero private BigDecimal plannedBudget;
    @Size(max = 3) private String currency;
}
