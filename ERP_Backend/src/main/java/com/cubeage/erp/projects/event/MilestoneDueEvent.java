package com.cubeage.erp.projects.event;

import java.time.Instant;

public record MilestoneDueEvent(Long milestoneId, Instant occurredAt) { }
