package com.cubeage.erp.manufacturing.dto.request;

import com.cubeage.erp.manufacturing.enums.WorkOrderStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;

public record UpdateWorkOrderRequest(
        String productName,
        @Min(value = 1, message = "Quantity must be at least 1") Integer quantity,
        String bomNumber,
        String machineName,
        String operatorName,
        LocalDate dueDate,
        WorkOrderStatus status,
        @Min(0) @Max(100) Integer progress
) {}
