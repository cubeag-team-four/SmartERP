package com.cubeage.erp.hr.service;

import com.cubeage.erp.hr.dto.leave.LeaveRequestDto;
import com.cubeage.erp.hr.dto.leave.LeaveResponse;
import com.cubeage.erp.hr.entity.LeaveRequest;
import com.cubeage.erp.hr.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class LeaveService {

    private final LeaveRequestRepository leaveRepository;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);

    @Transactional(readOnly = true)
    public List<LeaveResponse> getLeaves(Long tenantId) {
        List<LeaveRequest> list = leaveRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        if (list.isEmpty()) {
            return getDefaultLeaves(tenantId);
        }
        return list.stream().map(this::toResponse).toList();
    }

    public LeaveResponse createLeave(Long tenantId, LeaveRequestDto request) {
        String from = request.getFrom() != null ? request.getFrom()
                : (request.getStartDate() != null ? request.getStartDate().format(FORMATTER) : "—");
        String to = request.getTo() != null ? request.getTo()
                : (request.getEndDate() != null ? request.getEndDate().format(FORMATTER) : "—");

        long count = leaveRepository.count() + 1;
        String code = String.format("LV-%d-%04d", LocalDate.now().getYear(), count);

        LeaveRequest entity = LeaveRequest.builder()
                .tenantId(tenantId)
                .leaveCode(code)
                .employeeId(request.getEmployeeId())
                .employeeName(request.getEmployeeName())
                .department(request.getDepartment())
                .leaveType(request.getLeaveType() != null ? request.getLeaveType() : "Casual Leave")
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .formattedFrom(from)
                .formattedTo(to)
                .days(request.getDays() != null ? request.getDays() : "1d")
                .reason(request.getReason())
                .status("PENDING")
                .build();

        return toResponse(leaveRepository.save(entity));
    }

    public LeaveResponse updateStatus(Long tenantId, Long id, String status) {
        LeaveRequest leave = leaveRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found: " + id));

        leave.setStatus(status.toUpperCase());
        return toResponse(leaveRepository.save(leave));
    }

    public LeaveResponse approveLeave(Long tenantId, Long id) {
        return updateStatus(tenantId, id, "APPROVED");
    }

    public LeaveResponse rejectLeave(Long tenantId, Long id) {
        return updateStatus(tenantId, id, "REJECTED");
    }

    private LeaveResponse toResponse(LeaveRequest item) {
        return LeaveResponse.builder()
                .id(item.getId())
                .tenantId(item.getTenantId())
                .leaveCode(item.getLeaveCode())
                .employeeId(item.getEmployeeId())
                .employee(item.getEmployeeName())
                .employeeName(item.getEmployeeName())
                .dept(item.getDepartment())
                .department(item.getDepartment())
                .type(item.getLeaveType())
                .leaveType(item.getLeaveType())
                .startDate(item.getStartDate())
                .endDate(item.getEndDate())
                .from(item.getFormattedFrom())
                .to(item.getFormattedTo())
                .days(item.getDays())
                .reason(item.getReason())
                .status(item.getStatus())
                .build();
    }

    private List<LeaveResponse> getDefaultLeaves(Long tenantId) {
        return List.of(
                LeaveResponse.builder()
                        .id(1L)
                        .tenantId(tenantId)
                        .leaveCode("LV-2026-0389")
                        .employee("Rohan Verma")
                        .employeeName("Rohan Verma")
                        .dept("Sales")
                        .department("Sales")
                        .type("Casual Leave")
                        .leaveType("Casual Leave")
                        .from("11 Aug 2026")
                        .to("12 Aug 2026")
                        .days("2d")
                        .status("PENDING")
                        .build(),
                LeaveResponse.builder()
                        .id(2L)
                        .tenantId(tenantId)
                        .leaveCode("LV-2026-0388")
                        .employee("Smita Gupta")
                        .employeeName("Smita Gupta")
                        .dept("HR")
                        .department("HR")
                        .type("Sick Leave")
                        .leaveType("Sick Leave")
                        .from("09 Aug 2026")
                        .to("10 Aug 2026")
                        .days("2d")
                        .status("APPROVED")
                        .build(),
                LeaveResponse.builder()
                        .id(3L)
                        .tenantId(tenantId)
                        .leaveCode("LV-2026-0387")
                        .employee("Aditya Kumar")
                        .employeeName("Aditya Kumar")
                        .dept("IT")
                        .department("IT")
                        .type("Earned Leave")
                        .leaveType("Earned Leave")
                        .from("15 Aug 2026")
                        .to("20 Aug 2026")
                        .days("4d")
                        .status("PENDING")
                        .build(),
                LeaveResponse.builder()
                        .id(4L)
                        .tenantId(tenantId)
                        .leaveCode("LV-2026-0386")
                        .employee("Kavya Reddy")
                        .employeeName("Kavya Reddy")
                        .dept("Marketing")
                        .department("Marketing")
                        .type("Casual Leave")
                        .leaveType("Casual Leave")
                        .from("08 Aug 2026")
                        .to("08 Aug 2026")
                        .days("1d")
                        .status("REJECTED")
                        .build()
        );
    }
}
