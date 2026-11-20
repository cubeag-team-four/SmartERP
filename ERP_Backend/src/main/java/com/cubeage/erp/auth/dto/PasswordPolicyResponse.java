package com.cubeage.erp.auth.dto;

/** Public description of the password rules so every screen shows the same requirements. */
public record PasswordPolicyResponse(int minLength, int maxLength, int requiredCharacterClasses, int historySize,
                                     boolean breachCheck) { }
