package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code mfaToken} during login enrollment; omitted when enabling from account settings. */
public record MfaEnableRequest(String mfaToken, @NotBlank @Size(max = 10) String code) { }
