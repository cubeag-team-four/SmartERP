package com.cubeage.erp.auth.repository;

import com.cubeage.erp.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /** Looks up by hash regardless of revocation, so reuse of a rotated token can be detected. */
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedReason = COALESCE(r.revokedReason, :reason) "
            + "WHERE r.userId = :userId AND r.revoked = false")
    int revokeAllByUserId(@Param("userId") Long userId, @Param("reason") String reason);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedReason = COALESCE(r.revokedReason, :reason) "
            + "WHERE r.familyId = :familyId AND r.revoked = false")
    int revokeFamily(@Param("familyId") String familyId, @Param("reason") String reason);
}
