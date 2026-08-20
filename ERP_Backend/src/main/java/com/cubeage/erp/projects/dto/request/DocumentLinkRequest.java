package com.cubeage.erp.projects.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class DocumentLinkRequest {
    @NotNull private Long projectId;
    private Long documentId;
    @NotBlank @Size(max = 200) private String title;
    @Size(max = 1000) private String url;
}
