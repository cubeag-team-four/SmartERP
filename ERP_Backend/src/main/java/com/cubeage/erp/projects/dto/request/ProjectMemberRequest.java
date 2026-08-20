package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.ProjectMemberRole;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProjectMemberRequest {
    @NotNull private Long projectId;
    @NotNull private Long userId;
    @NotNull private ProjectMemberRole role;
    @PositiveOrZero private BigDecimal hourlyRate;
}
