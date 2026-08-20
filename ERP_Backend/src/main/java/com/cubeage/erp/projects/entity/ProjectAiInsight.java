package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import com.cubeage.erp.projects.enums.AiInsightType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "project_ai_insights")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectAiInsight extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private AiInsightType type;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, length = 8000) private String content;
    @Column(precision = 5, scale = 4) private BigDecimal confidence;
    @Column(name = "generated_at", nullable = false) private LocalDateTime generatedAt;
    @Column(nullable = false) private boolean resolved;
}
