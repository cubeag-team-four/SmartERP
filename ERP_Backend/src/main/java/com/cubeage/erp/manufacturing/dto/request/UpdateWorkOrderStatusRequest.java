package com.cubeage.erp.manufacturing.dto.request;

import com.cubeage.erp.manufacturing.enums.WorkOrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateWorkOrderStatusRequest(
        @NotNull(message = "Work order status is required") WorkOrderStatus status
) {}
