package com.cubeage.erp.projects.event;

import java.time.Instant;

public record ProjectCreatedEvent(Long projectId, Long tenantId, Instant occurredAt) { }
