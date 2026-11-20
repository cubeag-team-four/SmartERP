package com.cubeage.erp.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** SHA-256 of a one-time MFA recovery code. The plaintext is shown to the user once only. */
@Entity
@Table(name = "mfa_recovery_codes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MfaRecoveryCode {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;
    @Column(name = "used_at")
    private Instant usedAt;
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
