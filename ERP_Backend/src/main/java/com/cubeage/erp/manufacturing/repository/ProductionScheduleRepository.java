package com.cubeage.erp.manufacturing.repository;

import com.cubeage.erp.manufacturing.entity.ProductionSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionScheduleRepository extends JpaRepository<ProductionSchedule, Long> {

    List<ProductionSchedule> findByTenantIdOrderByStartDateAsc(Long tenantId);
}
