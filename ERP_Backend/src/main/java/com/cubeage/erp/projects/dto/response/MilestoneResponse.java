package com.cubeage.erp.projects.dto.response;

import com.cubeage.erp.projects.enums.MilestoneStatus;
import lombok.*;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MilestoneResponse {
    private Long id;
    private Long projectId;
    private String name;
    private String description;
    private LocalDate dueDate;
    private LocalDate completedDate;
    private MilestoneStatus status;
}
