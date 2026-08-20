package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.Project;
import com.cubeage.erp.projects.enums.ProjectStatus;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {
    Optional<Project> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndCodeIgnoreCase(Long tenantId, String code);
    long countByTenantIdAndStatus(Long tenantId, ProjectStatus status);
}
