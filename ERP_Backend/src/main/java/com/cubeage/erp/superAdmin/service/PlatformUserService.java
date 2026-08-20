package com.cubeage.erp.superAdmin.service;

import com.cubeage.erp.superAdmin.dto.user.*;

import java.util.List;

public interface PlatformUserService {
    PlatformUserResponse create(CreatePlatformUserRequest request);
    PlatformUserResponse update(Long id, UpdatePlatformUserRequest request);
    PlatformUserResponse getById(Long id);
    List<PlatformUserResponse> getAll();
    void delete(Long id);
}
