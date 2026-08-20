package com.cubeage.erp.projects.dto.response;

import com.cubeage.erp.projects.enums.ProjectMemberRole;
import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProjectMemberResponse {
    private Long id;
    private Long projectId;
    private Long userId;
    private String displayName;
    private ProjectMemberRole role;
    private BigDecimal hourlyRate;
    private boolean active;
}
