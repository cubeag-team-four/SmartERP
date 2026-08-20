package com.cubeage.erp.projects.event;

import java.time.Instant;

public record TaskAssignedEvent(Long taskId, Long assigneeId, Instant occurredAt) { }
