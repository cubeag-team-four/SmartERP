package com.cubeage.erp.manufacturing.dto.request;

import com.cubeage.erp.manufacturing.enums.QualityResult;

public record UpdateQualityInspectionRequest(
        QualityResult result,
        Integer quantity,
        String reason
) {}
