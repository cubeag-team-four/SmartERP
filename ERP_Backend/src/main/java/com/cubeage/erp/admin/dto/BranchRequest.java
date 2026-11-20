package com.cubeage.erp.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BranchRequest {
    /** Ignored: the server uses the authenticated admin's tenant. Kept for request compatibility. */
    private Long tenantId;

    @NotBlank
    private String name;

    private String address;

    private String currency;
}