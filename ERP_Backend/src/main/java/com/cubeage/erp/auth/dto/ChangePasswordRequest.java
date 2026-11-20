package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank @Size(max = 256) String oldPassword,
        @NotBlank @Size(max = 256) String newPassword) { }
