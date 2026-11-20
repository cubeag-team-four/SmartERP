package com.cubeage.erp.auth.repository;

import com.cubeage.erp.auth.entity.PasswordHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PasswordHistoryRepository extends JpaRepository<PasswordHistory, Long> {
    List<PasswordHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
