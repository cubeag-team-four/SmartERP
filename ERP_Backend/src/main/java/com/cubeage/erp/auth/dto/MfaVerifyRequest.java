package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Supply either {@code code} (6-digit TOTP) or {@code recoveryCode}. */
public record MfaVerifyRequest(
        @NotBlank String mfaToken,
        @Size(max = 10) String code,
        @Size(max = 20) String recoveryCode) { }
