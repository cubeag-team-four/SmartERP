package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectCostEntry;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface ProjectCostEntryRepository extends JpaRepository<ProjectCostEntry, Long> {
    List<ProjectCostEntry> findByProjectIdOrderByIncurredOnDesc(Long projectId);
    @Query("select coalesce(sum(c.amount), 0) from ProjectCostEntry c where c.projectId = :projectId")
    BigDecimal sumAmountByProjectId(@Param("projectId") Long projectId);
}
