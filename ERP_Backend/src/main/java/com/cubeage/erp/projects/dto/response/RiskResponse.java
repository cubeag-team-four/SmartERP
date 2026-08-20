package com.cubeage.erp.projects.dto.response;

import com.cubeage.erp.projects.enums.*;
import lombok.*;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RiskResponse {
    private Long id;
    private Long projectId;
    private String title;
    private String description;
    private RiskType type;
    private RiskLevel level;
    private RiskStatus status;
    private String mitigationPlan;
    private Long ownerId;
    private LocalDate targetResolutionDate;
}
