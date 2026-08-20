package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProjectBudgetRepository extends JpaRepository<ProjectBudget, Long> {
    Optional<ProjectBudget> findByProjectId(Long projectId);
}
