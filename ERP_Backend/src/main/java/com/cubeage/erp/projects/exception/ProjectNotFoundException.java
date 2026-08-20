package com.cubeage.erp.projects.exception;

import com.cubeage.erp.common.exception.ResourceNotFoundException;

public class ProjectNotFoundException extends ResourceNotFoundException {
    public ProjectNotFoundException(Long id) { super("Project not found: " + id); }
}
