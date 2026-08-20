package com.cubeage.erp.projects.event;

import java.time.Instant;

public record TimesheetSubmittedEvent(Long timesheetId, Long userId, Instant occurredAt) { }
