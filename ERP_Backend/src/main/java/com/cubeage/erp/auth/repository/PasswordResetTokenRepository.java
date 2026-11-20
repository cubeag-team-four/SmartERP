package com.cubeage.erp.auth.repository;

import com.cubeage.erp.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Invalidates earlier outstanding tokens when a new one is issued or one is used. */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.userId = :userId AND t.usedAt IS NULL")
    int invalidateAllForUser(@Param("userId") Long userId, @Param("now") Instant now);
}
