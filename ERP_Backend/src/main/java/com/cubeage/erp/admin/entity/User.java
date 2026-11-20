package com.cubeage.erp.admin.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_tenant_email",
                        columnNames = {
                                "tenant_id",
                                "email"
                        }
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String position;

    @JsonIgnore
    @Column(
            name = "password_hash",
            nullable = false
    )
    private String passwordHash;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @ManyToOne
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns =
            @JoinColumn(name = "user_id"),
            inverseJoinColumns =
            @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    // ---- Account protection (V13) -------------------------------------------------------

    @Column(name = "failed_login_count", nullable = false)
    @Builder.Default
    private Integer failedLoginCount = 0;

    @Column(name = "last_failed_login_at")
    private Instant lastFailedLoginAt;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    /** Embedded in every access token; bumping it revokes all outstanding access tokens. */
    @Column(name = "token_version", nullable = false)
    @Builder.Default
    private Integer tokenVersion = 0;

    // ---- TOTP MFA (V13) -------------------------------------------------------------------

    @Column(name = "mfa_enabled", nullable = false)
    @Builder.Default
    private Boolean mfaEnabled = false;

    /** AES-GCM ciphertext of the base32 TOTP secret; never serialised or returned by any API. */
    @JsonIgnore
    @Column(name = "mfa_secret", length = 512)
    private String mfaSecret;

    @Column(name = "mfa_enrolled_at")
    private Instant mfaEnrolledAt;

    /** Last accepted TOTP time step, so a code cannot be replayed within its validity window. */
    @Column(name = "mfa_last_used_step")
    private Long mfaLastUsedStep;

    public void bumpTokenVersion() {
        this.tokenVersion = (tokenVersion == null ? 0 : tokenVersion) + 1;
    }

    public boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }
}