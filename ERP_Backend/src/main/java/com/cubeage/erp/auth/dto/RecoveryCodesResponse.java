package com.cubeage.erp.auth.dto;

import java.util.List;

/** Plaintext recovery codes: returned only at creation/regeneration, never stored or shown again. */
public record RecoveryCodesResponse(List<String> recoveryCodes) { }
