package com.cubeage.erp.auth.dto;

/** Optional mfaToken: required during login enrollment, omitted when already signed in. */
public record MfaTokenRequest(String mfaToken) { }
