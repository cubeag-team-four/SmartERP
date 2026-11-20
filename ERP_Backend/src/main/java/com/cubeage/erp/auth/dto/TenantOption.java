package com.cubeage.erp.auth.dto;

/** A company the user can sign into, offered only after the password was verified. */
public record TenantOption(String code, String name) { }
