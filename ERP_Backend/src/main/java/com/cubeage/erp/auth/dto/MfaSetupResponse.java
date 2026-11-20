package com.cubeage.erp.auth.dto;

/** Shown once during enrollment so the user can add the account to an authenticator app. */
public record MfaSetupResponse(String secret, String otpauthUri, String issuer, String accountName) { }
