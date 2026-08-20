package com.cubeage.erp.projects.event;

import java.math.BigDecimal;
import java.time.Instant;

public record BudgetThresholdExceededEvent(Long projectId, BigDecimal utilizationPercent, Instant occurredAt) { }
