package com.cubeage.erp.projects.event;

import java.time.Instant;

public record TaskAtRiskEvent(Long taskId, String reason, Instant occurredAt) { }
