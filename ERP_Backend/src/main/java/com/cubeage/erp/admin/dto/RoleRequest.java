package com.cubeage.erp.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class RoleRequest {

    /** Optional; ignored unless the caller is a Super Admin. Defaults to the caller's tenant. */
    private Long tenantId;

    @NotBlank
    private String name;

    private Set<Long> permissionIds;
}