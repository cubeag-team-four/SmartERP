package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class RiskRequest {
    @NotNull private Long projectId;
    @NotBlank @Size(max = 200) private String title;
    @Size(max = 4000) private String description;
    @NotNull private RiskType type;
    @NotNull private RiskLevel level;
    private RiskStatus status;
    @Size(max = 4000) private String mitigationPlan;
    private Long ownerId;
    private LocalDate targetResolutionDate;
}
