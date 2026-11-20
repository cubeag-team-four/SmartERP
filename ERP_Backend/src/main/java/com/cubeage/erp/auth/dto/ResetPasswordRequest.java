package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(@NotBlank @Size(max = 200) String token, @NotBlank @Size(max = 256) String newPassword) { }
