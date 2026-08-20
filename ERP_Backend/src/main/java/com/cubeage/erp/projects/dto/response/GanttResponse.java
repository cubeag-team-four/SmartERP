package com.cubeage.erp.projects.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GanttResponse {
    private Long projectId;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<GanttItem> items;

    public record GanttItem(Long id, String type, String title, LocalDate startDate,
                            LocalDate endDate, Integer progressPercent, List<Long> dependencyIds) { }
}
