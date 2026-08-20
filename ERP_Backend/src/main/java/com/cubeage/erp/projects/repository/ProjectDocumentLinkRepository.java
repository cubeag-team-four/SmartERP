package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectDocumentLink;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectDocumentLinkRepository extends JpaRepository<ProjectDocumentLink, Long> {
    List<ProjectDocumentLink> findByProjectIdOrderByIdDesc(Long projectId);
}
