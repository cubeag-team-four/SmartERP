package com.cubeage.erp.projects.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateTimesheetRequest {
    @NotNull private Long projectId;
    private Long taskId;
    @NotNull private Long userId;
    @NotNull private LocalDate workDate;
    @NotNull @DecimalMin("0.25") @DecimalMax("24.0") private BigDecimal hours;
    @Size(max = 2000) private String notes;
}
