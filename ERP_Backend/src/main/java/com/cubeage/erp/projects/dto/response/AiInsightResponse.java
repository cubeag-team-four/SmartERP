package com.cubeage.erp.projects.dto.response;

import com.cubeage.erp.projects.enums.AiInsightType;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AiInsightResponse {
    private Long id;
    private Long projectId;
    private AiInsightType type;
    private String title;
    private String content;
    private BigDecimal confidence;
    private LocalDateTime generatedAt;
    private boolean resolved;
}
