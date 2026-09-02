package com.cubeage.erp.manufacturing.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record BomDetailsResponse(
        Long id,
        String bomNumber,
        String product,
        String version,
        Integer components,
        BigDecimal cost,
        String formattedCost,
        String notes,
        List<BomItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}