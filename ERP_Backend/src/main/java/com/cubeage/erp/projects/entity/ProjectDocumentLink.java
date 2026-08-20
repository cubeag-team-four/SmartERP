package com.cubeage.erp.projects.entity;

import com.cubeage.erp.common.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "project_document_links")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectDocumentLink extends BaseEntity {
    @Column(name = "project_id", nullable = false) private Long projectId;
    @Column(name = "document_id") private Long documentId;
    @Column(nullable = false, length = 200) private String title;
    @Column(length = 1000) private String url;
}
