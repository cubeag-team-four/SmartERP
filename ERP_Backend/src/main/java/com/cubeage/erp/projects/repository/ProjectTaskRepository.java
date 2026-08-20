package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectTask;
import com.cubeage.erp.projects.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectTaskRepository extends JpaRepository<ProjectTask, Long> {
    List<ProjectTask> findByProjectIdOrderByDueDate(Long projectId);
    List<ProjectTask> findByAssigneeIdAndStatusNot(Long assigneeId, TaskStatus status);
    long countByProjectIdAndStatus(Long projectId, TaskStatus status);
}
