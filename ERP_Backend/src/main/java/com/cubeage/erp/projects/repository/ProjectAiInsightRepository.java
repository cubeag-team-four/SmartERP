package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectAiInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectAiInsightRepository extends JpaRepository<ProjectAiInsight, Long> {
    List<ProjectAiInsight> findByProjectIdAndResolvedFalseOrderByGeneratedAtDesc(Long projectId);
}
