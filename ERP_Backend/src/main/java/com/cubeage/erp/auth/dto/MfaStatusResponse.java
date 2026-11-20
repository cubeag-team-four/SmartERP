package com.cubeage.erp.auth.dto;

import java.time.Instant;

public record MfaStatusResponse(boolean enabled, boolean required, Instant enrolledAt, long recoveryCodesRemaining) { }
