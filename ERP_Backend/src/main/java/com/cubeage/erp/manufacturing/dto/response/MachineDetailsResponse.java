package com.cubeage.erp.manufacturing.dto.response;

import com.cubeage.erp.manufacturing.enums.MachineStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MachineDetailsResponse(
        Long id,
        String code,
        String name,
        String floor,
        MachineStatus status,
        String statusType,
        Integer utilization,
        LocalDate lastMaintenance,
        LocalDate nextMaintenance,
        List<MachineMaintenanceResponse> recentMaintenances,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
