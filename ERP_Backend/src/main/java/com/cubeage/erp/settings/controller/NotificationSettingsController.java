package com.cubeage.erp.settings.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import com.cubeage.erp.security.SecurityUtils;
import com.cubeage.erp.settings.dto.notification.*;
import com.cubeage.erp.settings.service.NotificationSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/settings/notifications") @RequiredArgsConstructor @PreAuthorize("isAuthenticated()")
public class NotificationSettingsController {
    private final NotificationSettingsService service;
    @GetMapping public List<NotificationPreferenceResponse> list(){return service.list(SecurityUtils.currentTenantId(),SecurityUtils.currentUserId());}
    @PutMapping public NotificationPreferenceResponse update(@Valid @RequestBody NotificationPreferenceRequest r){return service.update(SecurityUtils.currentTenantId(),SecurityUtils.currentUserId(),r);}
}
