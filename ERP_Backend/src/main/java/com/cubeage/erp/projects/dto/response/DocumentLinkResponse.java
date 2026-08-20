package com.cubeage.erp.projects.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DocumentLinkResponse {
    private Long id;
    private Long projectId;
    private Long documentId;
    private String title;
    private String url;
    private LocalDateTime createdAt;
}
