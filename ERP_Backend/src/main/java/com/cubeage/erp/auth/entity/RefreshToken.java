package com.cubeage.erp.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A refresh token. Only the SHA-256 of the token is stored (column {@code token}); the raw
 * value exists only in the client's HttpOnly cookie. Tokens issued from one login share a
 * {@code familyId}: presenting an already-rotated token revokes the whole family (theft
 * detection, SRS 12.1).
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SHA-256 hex of the raw token. */
    @Column(name = "token", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "family_id", length = 64)
    private String familyId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private Boolean revoked = false;

    @Column(name = "revoked_reason", length = 40)
    private String revokedReason;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    public void revoke(String reason) {
        this.revoked = true;
        if (this.revokedReason == null) {
            this.revokedReason = reason;
        }
    }
}
