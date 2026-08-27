package com.cubeage.erp.manufacturing.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AssignMachineRequest(
        @NotBlank(message = "Machine code is required") String machineCode
) {}
