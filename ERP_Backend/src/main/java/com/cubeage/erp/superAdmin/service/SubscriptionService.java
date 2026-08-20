package com.cubeage.erp.superAdmin.service;

import com.cubeage.erp.superAdmin.dto.subscription.*;

import java.util.List;

public interface SubscriptionService {
    SubscriptionResponse create(CreateSubscriptionRequest request);
    SubscriptionResponse update(Long id, UpdateSubscriptionRequest request);
    SubscriptionResponse renew(Long id, RenewSubscriptionRequest request);
    SubscriptionResponse getById(Long id);
    List<SubscriptionResponse> getByTenantId(Long tenantId);
    void cancel(Long id, String reason);
}
