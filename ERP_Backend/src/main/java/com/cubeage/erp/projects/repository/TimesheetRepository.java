package com.cubeage.erp.projects.repository;

import com.cubeage.erp.projects.entity.Timesheet;
import com.cubeage.erp.projects.enums.TimesheetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {
    List<Timesheet> findByProjectIdOrderByWorkDateDesc(Long projectId);
    List<Timesheet> findByUserIdAndStatus(Long userId, TimesheetStatus status);
}
