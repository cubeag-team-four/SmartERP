package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectRisk;
import com.cubeage.erp.projects.enums.RiskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRiskRepository extends JpaRepository<ProjectRisk, Long> {
    List<ProjectRisk> findByProjectIdOrderByIdDesc(Long projectId);
    long countByProjectIdAndStatusNot(Long projectId, RiskStatus status);
}
