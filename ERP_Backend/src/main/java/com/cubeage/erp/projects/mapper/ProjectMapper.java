package com.cubeage.erp.projects.mapper;

import com.cubeage.erp.projects.dto.request.UpdateProjectRequest;
import com.cubeage.erp.projects.dto.response.ProjectResponse;
import com.cubeage.erp.projects.entity.Project;
import org.mapstruct.*;
import java.util.List;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProjectMapper {
    ProjectResponse toResponse(Project project);
    List<ProjectResponse> toResponseList(List<Project> projects);
    void update(UpdateProjectRequest request, @MappingTarget Project project);
}
