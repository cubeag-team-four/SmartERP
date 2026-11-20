package com.cubeage.erp.auth.service;

import com.cubeage.erp.settings.entity.AuditLog;
import com.cubeage.erp.settings.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes security events to {@code audit_logs} (SRS 12.10). Each write runs in its own
 * transaction so the event survives when the surrounding operation fails (e.g. a failed
 * login), and an audit failure never breaks the business operation.
 *
 * <p>Never pass passwords, tokens, TOTP codes, recovery codes or secrets in {@code details}.
 * Events with no known tenant (e.g. login attempts for unknown emails) go to the application
 * log only, because {@code audit_logs.tenant_id} is mandatory.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityAuditService {

    public static final String MODULE = "AUTH";

    private final AuditLogRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long tenantId, Long actorUserId, String action, String outcome,
                       String entityType, Object entityId, String details, ClientInfo client) {
        if (tenantId == null) {
            log.info("security-event action={} outcome={} ip={} details={}", action, outcome,
                    client == null ? null : client.ip(), details);
            return;
        }
        try {
            repository.save(AuditLog.builder()
                    .tenantId(tenantId)
                    .actorUserId(actorUserId)
                    .action(action)
                    .module(MODULE)
                    .outcome(outcome)
                    .entityType(entityType)
                    .entityId(entityId == null ? null : String.valueOf(entityId))
                    .details(details)
                    .ipAddress(client == null ? null : client.ip())
                    .userAgent(client == null ? null : client.userAgent())
                    .build());
        } catch (RuntimeException e) {
            log.error("Failed to write audit event action={} tenant={}: {}", action, tenantId, e.getMessage());
        }
    }

    public void success(Long tenantId, Long userId, String action, ClientInfo client) {
        record(tenantId, userId, action, "SUCCESS", "USER", userId, null, client);
    }

    public void failure(Long tenantId, Long userId, String action, String reason, ClientInfo client) {
        record(tenantId, userId, action, "FAILURE", "USER", userId, reason, client);
    }
}
