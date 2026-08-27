package com.cubeage.erp.manufacturing.dto.request;

import java.time.LocalDate;

public record CompleteMaintenanceRequest(
        LocalDate completedDate,
        String notes
) {}
