package com.cubeage.erp.hr.controller;

import com.cubeage.erp.common.exception.ForbiddenException;
import com.cubeage.erp.common.exception.ResourceNotFoundException;
import com.cubeage.erp.hr.dto.leave.LeaveResponse;
import com.cubeage.erp.hr.entity.Employee;
import com.cubeage.erp.hr.service.LeaveService;
import com.cubeage.erp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LeaveControllerScopeTest {

    private LeaveService leaveService;
    private LeaveController controller;

    @BeforeEach
    void setUp() {
        leaveService = mock(LeaveService.class);
        controller = new LeaveController(leaveService);
    }

    @AfterEach
    void tearDown() { TestAuth.clear(); }

    private static Employee employee(long id) {
        Employee e = new Employee();
        e.setId(id);
        return e;
    }

    @Test
    void employeeCannotListAnotherEmployeesLeavesByPassingTheirId() {
        TestAuth.loginAs(5, 10, "EMPLOYEE");
        when(leaveService.findCurrentEmployee(10L)).thenReturn(Optional.of(employee(50)));
        when(leaveService.getLeaves(anyLong(), anyLong(), any(), any())).thenReturn(List.of());

        controller.getLeaves(999L, null, null);

        verify(leaveService).getLeaves(10L, 50L, null, null);   // own id, own tenant
        verify(leaveService, never()).getLeaves(anyLong(), eq(999L), any(), any());
    }

    @Test
    void employeeWithoutProfileIsRefusedInsteadOfFallingBackToRequestedId() {
        TestAuth.loginAs(5, 10, "EMPLOYEE");
        when(leaveService.findCurrentEmployee(10L)).thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () -> controller.getLeaves(999L, null, null));
        verify(leaveService, never()).getLeaves(anyLong(), any(), any(), any());
    }

    @Test
    void employeeCannotReadSomeoneElsesLeaveById() {
        TestAuth.loginAs(5, 10, "EMPLOYEE");
        when(leaveService.findCurrentEmployee(10L)).thenReturn(Optional.of(employee(50)));
        LeaveResponse other = new LeaveResponse();
        other.setEmployeeId(77L);
        when(leaveService.getLeave(10L, 3L)).thenReturn(other);

        assertThrows(ResourceNotFoundException.class, () -> controller.getLeave(3L));
    }

    @Test
    void hrManagerCanReadAnyLeaveInTheirTenant() {
        TestAuth.loginAs(5, 10, "HR_MANAGER");
        LeaveResponse other = new LeaveResponse();
        other.setEmployeeId(77L);
        when(leaveService.getLeave(10L, 3L)).thenReturn(other);

        assertSame(other, controller.getLeave(3L));
    }

    @Test
    void tenantAlwaysComesFromThePrincipal() {
        TestAuth.loginAs(5, 10, "HR_MANAGER");
        controller.getLeaves(null, null, null);
        verify(leaveService).getLeaves(eq(10L), any(), any(), any());
    }
}
