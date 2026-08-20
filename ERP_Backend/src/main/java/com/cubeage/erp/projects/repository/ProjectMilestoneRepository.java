package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectMilestoneRepository extends JpaRepository<ProjectMilestone, Long> {
    List<ProjectMilestone> findByProjectIdOrderByDueDate(Long projectId);
}
