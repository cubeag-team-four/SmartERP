package com.cubeage.erp.manufacturing.repository;

import com.cubeage.erp.manufacturing.entity.MachineMaintenance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MachineMaintenanceRepository extends JpaRepository<MachineMaintenance, Long> {

    List<MachineMaintenance> findByMachineIdAndTenantIdOrderByScheduledDateDesc(Long machineId, Long tenantId);

    List<MachineMaintenance> findByTenantIdOrderByScheduledDateDesc(Long tenantId);
}
