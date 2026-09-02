package com.cubeage.erp.manufacturing.service.impl;

import com.cubeage.erp.manufacturing.dto.request.CreateQualityInspectionRequest;
import com.cubeage.erp.manufacturing.dto.response.QualityInspectionResponse;
import com.cubeage.erp.manufacturing.dto.response.QualitySummaryResponse;
import com.cubeage.erp.manufacturing.dto.response.RejectionResponse;
import com.cubeage.erp.manufacturing.entity.QualityInspection;
import com.cubeage.erp.manufacturing.enums.QualityResult;
import com.cubeage.erp.manufacturing.mapper.QualityInspectionMapper;
import com.cubeage.erp.manufacturing.repository.QualityInspectionRepository;
import com.cubeage.erp.manufacturing.service.QualityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class QualityServiceImpl implements QualityService {

    private final QualityInspectionRepository inspectionRepository;
    private final QualityInspectionMapper mapper;

    @Override
    public QualityInspectionResponse createInspection(Long tenantId, CreateQualityInspectionRequest request) {
        QualityInspection inspection = QualityInspection.builder()
                .tenantId(tenantId)
                .workOrderNumber(request.workOrderNumber().trim())
                .productName(request.productName().trim())
                .type(request.type())
                .result(request.result())
                .quantity(request.quantity())
                .reason(request.reason())
                .inspectorName(request.inspectorName())
                .build();

        return mapper.toResponse(inspectionRepository.save(inspection));
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityInspectionResponse> getInspections(Long tenantId) {
        return inspectionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QualitySummaryResponse getQualityControlSummary(Long tenantId) {
        long total = inspectionRepository.countByTenantId(tenantId);
        long pass = inspectionRepository.countByTenantIdAndResult(tenantId, QualityResult.PASS);
        long rework = inspectionRepository.countByTenantIdAndResult(tenantId, QualityResult.REWORK);
        long reject = inspectionRepository.countByTenantIdAndResult(tenantId, QualityResult.REJECT);

        double passRate = total == 0 ? 98.2 : ((double) pass / total) * 100.0;
        double reworkRate = total == 0 ? 1.4 : ((double) rework / total) * 100.0;
        double rejectionRate = total == 0 ? 0.4 : ((double) reject / total) * 100.0;

        List<RejectionResponse> recentRejections = inspectionRepository
                .findTop5ByTenantIdAndResultInOrderByCreatedAtDesc(tenantId, List.of(QualityResult.REJECT, QualityResult.REWORK))
                .stream()
                .map(mapper::toRejectionResponse)
                .toList();

        return new QualitySummaryResponse(
                Math.round(passRate * 10.0) / 10.0,
                Math.round(reworkRate * 10.0) / 10.0,
                Math.round(rejectionRate * 10.0) / 10.0,
                recentRejections
        );
    }
}