package com.cubeage.erp.auth.dto;

import java.util.List;

/** The signed-in user's identity and effective authorities (for permission-aware UI only). */
public record MeResponse(Long userId, Long tenantId, String tenantCode, String name, String email,
                         String role, List<String> roles, List<String> permissions,
                         boolean mfaEnabled, boolean mfaRequired) { }
