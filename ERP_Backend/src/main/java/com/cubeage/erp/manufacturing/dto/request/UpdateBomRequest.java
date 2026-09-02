package com.cubeage.erp.manufacturing.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateBomRequest(
        @NotBlank(message = "Product name is required") String product,
        @NotBlank(message = "Version is required") String version,
        String notes
) {}