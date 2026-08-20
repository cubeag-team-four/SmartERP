package com.cubeage.erp.projects.exception;

import com.cubeage.erp.common.exception.ResourceNotFoundException;

public class TaskNotFoundException extends ResourceNotFoundException {
    public TaskNotFoundException(Long id) { super("Project task not found: " + id); }
}
