package com.cubeage.erp.projects.exception;

import com.cubeage.erp.common.exception.ResourceNotFoundException;

public class TimesheetNotFoundException extends ResourceNotFoundException {
    public TimesheetNotFoundException(Long id) { super("Timesheet not found: " + id); }
}
