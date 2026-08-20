package com.cubeage.erp.projects.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TimesheetDecisionRequest {
    private boolean approved;
    @Size(max = 1000) private String comment;
}
