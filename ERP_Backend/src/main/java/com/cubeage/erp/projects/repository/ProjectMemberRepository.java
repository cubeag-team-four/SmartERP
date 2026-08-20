package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {
    List<ProjectMember> findByProjectIdAndActiveTrue(Long projectId);
    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, Long userId);
}
