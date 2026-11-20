package com.cubeage.erp.auth.repository;

import com.cubeage.erp.auth.entity.MfaRecoveryCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCode, Long> {
    Optional<MfaRecoveryCode> findByUserIdAndCodeHashAndUsedAtIsNull(Long userId, String codeHash);

    long countByUserIdAndUsedAtIsNull(Long userId);

    @Modifying
    @Query("DELETE FROM MfaRecoveryCode c WHERE c.userId = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
