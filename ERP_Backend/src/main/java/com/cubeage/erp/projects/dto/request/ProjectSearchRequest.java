package com.cubeage.erp.projects.dto.request;

import com.cubeage.erp.projects.enums.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class ProjectSearchRequest {
    private String query;
    private ProjectStatus status;
    private ProjectPriority priority;
    private Long managerId;
    private LocalDate startsAfter;
    private LocalDate endsBefore;
    @PositiveOrZero private Integer page;
    @Min(1) @Max(200) private Integer size;
}
