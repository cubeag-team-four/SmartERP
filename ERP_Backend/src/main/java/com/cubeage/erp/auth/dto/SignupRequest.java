package com.cubeage.erp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Self-service company registration (SRS 2.6): creates a trial company and its Admin. */
public record SignupRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 160) String companyName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 256) String password,
        @Size(max = 30) String phone) { }
