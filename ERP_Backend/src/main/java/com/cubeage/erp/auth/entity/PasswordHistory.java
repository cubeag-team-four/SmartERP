package com.cubeage.erp.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Previous password hashes (never plaintext), used to block reuse of recent passwords. */
@Entity
@Table(name = "password_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
