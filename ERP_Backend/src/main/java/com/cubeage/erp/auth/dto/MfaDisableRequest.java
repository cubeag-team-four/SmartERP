package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MfaDisableRequest(@NotBlank @Size(max = 256) String password, @NotBlank @Size(max = 10) String code) { }
