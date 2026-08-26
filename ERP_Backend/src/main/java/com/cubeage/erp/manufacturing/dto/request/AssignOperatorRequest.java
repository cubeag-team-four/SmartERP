package com.cubeage.erp.manufacturing.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AssignOperatorRequest(
        @NotBlank(message = "Operator name is required") String operatorName
) {}
