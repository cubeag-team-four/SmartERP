package com.cubeage.erp.projects.exception;

import com.cubeage.erp.common.exception.ResourceNotFoundException;

public class MilestoneNotFoundException extends ResourceNotFoundException {
    public MilestoneNotFoundException(Long id) { super("Project milestone not found: " + id); }
}
