package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MfaCodeRequest(@NotBlank @Size(max = 10) String code) { }
