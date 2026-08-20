package com.cubeage.erp.projects.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProjectDashboardResponse {
    private long totalProjects;
    private long activeProjects;
    private long overdueProjects;
    private long openTasks;
    private long overdueTasks;
    private long openRisks;
    private BigDecimal totalBudget;
    private BigDecimal totalSpend;
    private List<ProjectResponse> recentProjects;
    private List<AiInsightResponse> insights;
}
