package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskDependencyRepository extends JpaRepository<TaskDependency, Long> {
    List<TaskDependency> findByTaskId(Long taskId);
    boolean existsByTaskIdAndDependsOnTaskId(Long taskId, Long dependsOnTaskId);
}
