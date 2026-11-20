package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code tenantCode} is only needed when the same email exists in more than one company. */
public record LoginRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 256) String password,
        @Size(max = 50) String tenantCode) { }
