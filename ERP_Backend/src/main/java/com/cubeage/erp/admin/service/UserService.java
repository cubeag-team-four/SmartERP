package com.cubeage.erp.admin.service;

import com.cubeage.erp.auth.security.PasswordPolicyService;
import com.cubeage.erp.auth.service.MfaService;
import com.cubeage.erp.auth.service.SecurityAuditService;
import com.cubeage.erp.auth.service.SessionService;
import com.cubeage.erp.common.exception.ForbiddenException;
import com.cubeage.erp.security.SecurityUtils;

import com.cubeage.erp.admin.dto.CreateUserRequest;
import com.cubeage.erp.admin.dto.UpdateUserRequest;
import com.cubeage.erp.admin.dto.UserResponse;
import com.cubeage.erp.admin.entity.Branch;
import com.cubeage.erp.admin.entity.Department;
import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.admin.mapper.UserMapper;
import com.cubeage.erp.admin.repository.BranchRepository;
import com.cubeage.erp.admin.repository.DepartmentRepository;
import com.cubeage.erp.admin.repository.RoleRepository;
import com.cubeage.erp.admin.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import com.cubeage.erp.common.exception.DuplicateResourceException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    private final BranchRepository branchRepository;

    private final DepartmentRepository departmentRepository;

    private final RoleRepository roleRepository;

    private final UserMapper userMapper;

    private final PasswordEncoder passwordEncoder;

    private final RoleAssignmentGuard roleGuard;

    private final PasswordPolicyService passwordPolicy;

    private final SessionService sessionService;

    private final MfaService mfaService;

    private final SecurityAuditService audit;

public UserResponse createUser(Long tenantId, CreateUserRequest request) {
    String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

    if (userRepository.existsByTenantIdAndEmailIgnoreCase(tenantId, email)) {
        throw new DuplicateResourceException(
                "A user with this email address already exists in this tenant"
        );
    }

    Role role = roleRepository
            .findById(request.getRoleId())
            .filter(item -> item.getTenantId().equals(tenantId))
            .orElseThrow(() -> new RuntimeException("Selected role is invalid."));
    roleGuard.assertCanGrant(Set.of(role));
    passwordPolicy.validate(request.getPassword(), email, request.getName(), tenantId, null);

    Branch branch = null;
    if (request.getBranchId() != null) {
        branch = branchRepository
                .findByIdAndTenantId(request.getBranchId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Branch not found."));
    }

    Department department = null;
    if (request.getDepartmentId() != null) {
        department = departmentRepository
                .findByIdAndTenantId(request.getDepartmentId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Department not found."));

        if (branch != null &&
                department.getBranch() != null &&
                !department.getBranch().getId().equals(branch.getId())) {
            throw new RuntimeException("Department does not belong to selected branch");
        }
    }

    User user = User.builder()
            .tenantId(tenantId)
            .name(request.getName().trim())
            .email(email)
            .position(request.getPosition().trim())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .active(Boolean.TRUE.equals(request.getActive()))
            .branch(branch)
            .department(department)
            .roles(Set.of(role))
            .build();

    User saved = userRepository.save(user);
    audit.record(tenantId, SecurityUtils.currentUserId(), "USER_CREATED", "SUCCESS", "USER", saved.getId(),
            "role=" + role.getName(), null);
    return userMapper.toResponse(saved);
}


    public void deleteUser(
            Long id,
            Long tenantId
    ) {
        roleGuard.assertNotSelf(id, "delete");
        User user = getUserEntity(id, tenantId);
        assertCanManageUser(user);

        sessionService.revokeAllSessions(user, "USER_DELETED");
        userRepository.delete(user);
        audit.record(tenantId, SecurityUtils.currentUserId(), "USER_DELETED", "SUCCESS", "USER", id, null, null);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers(
            Long tenantId
    ) {

        return userRepository
                .findByTenantIdOrderByIdDesc(
                        tenantId
                )
                .stream()
                .map(
                        userMapper::toResponse
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(
            Long id,
            Long tenantId
    ) {

        return userMapper.toResponse(
                getUserEntity(
                        id,
                        tenantId
                )
        );
    }

    public UserResponse changeStatus(
            Long id,
            Long tenantId,
            Boolean active
    ) {

        roleGuard.assertNotSelf(id, "change the status of");
        User user =
                getUserEntity(
                        id,
                        tenantId
                );
        assertCanManageUser(user);

        user.setActive(active);
        if (!Boolean.TRUE.equals(active)) {
            sessionService.revokeAllSessions(user, "USER_DEACTIVATED");
        }
        audit.record(tenantId, SecurityUtils.currentUserId(), Boolean.TRUE.equals(active) ? "USER_ACTIVATED" : "USER_DEACTIVATED",
                "SUCCESS", "USER", id, null, null);

        return userMapper.toResponse(
                userRepository.save(user)
        );
    }

    public UserResponse assignRoles(
            Long userId,
            Long tenantId,
            Set<Long> roleIds
    ) {

        roleGuard.assertNotSelf(userId, "change the roles of");
        User user =
                getUserEntity(
                        userId,
                        tenantId
                );
        assertCanManageUser(user);

        Set<Role> roles =
                validateRoles(
                        roleIds,
                        tenantId
                );
        roleGuard.assertCanGrant(roles);

        user.setRoles(roles);
        sessionService.revokeAllSessions(user, "ROLES_CHANGED");
        audit.record(tenantId, SecurityUtils.currentUserId(), "ROLE_ASSIGNMENT_CHANGED", "SUCCESS", "USER", userId,
                "roles=" + roles.stream().map(Role::getName).sorted().toList(), null);

        return userMapper.toResponse(
                userRepository.save(user)
        );
    }

    /** Admin reset of a user's MFA (lost device): clears enrollment and signs them out everywhere. */
    public void resetMfa(Long userId, Long tenantId) {
        roleGuard.assertNotSelf(userId, "reset MFA on");
        User user = getUserEntity(userId, tenantId);
        assertCanManageUser(user);
        mfaService.adminReset(user, SecurityUtils.currentUserId(), null);
        sessionService.revokeAllSessions(user, "MFA_RESET");
    }

    /** A tenant admin may not modify, deactivate or delete a platform Super Admin account. */
    private void assertCanManageUser(User target) {
        roleGuard.assertCanGrant(target.getRoles());
    }

    private User getUserEntity(
            Long id,
            Long tenantId
    ) {

        User user =
                userRepository
                        .findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "User not found"
                                )
                        );

        if (!user
                .getTenantId()
                .equals(tenantId)) {

            throw new RuntimeException(
                    "User does not belong to this tenant"
            );
        }

        return user;
    }

    private Set<Role> validateRoles(
            Set<Long> roleIds,
            Long tenantId
    ) {

        if (roleIds == null
                || roleIds.isEmpty()) {

            return new HashSet<>();
        }

        List<Role> roles =
                roleRepository
                        .findAllById(
                                roleIds
                        );

        if (roles.size()
                != roleIds.size()) {

            throw new RuntimeException(
                    "One or more roles not found"
            );
        }

        boolean wrongTenant =
                roles.stream()
                        .anyMatch(
                                role ->
                                        !role
                                                .getTenantId()
                                                .equals(
                                                        tenantId
                                                )
                        );

        if (wrongTenant) {

            throw new RuntimeException(
                    "Role does not belong to this tenant"
            );
        }

        return new HashSet<>(
                roles
        );
    }

    public UserResponse updateUser(
            Long userId,
            Long tenantId,
            @Valid UpdateUserRequest request
    ) {
        User user = getUserEntity(userId, tenantId);

        String email = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        Role role = roleRepository
                .findById(request.getRoleId())
                .filter(item -> item.getTenantId().equals(tenantId))
                .orElseThrow(() ->
                        new RuntimeException("Selected role is invalid.")
                );
        assertCanManageUser(user);
        roleGuard.assertCanGrant(Set.of(role));

        boolean wasActive = Boolean.TRUE.equals(user.getActive());
        boolean editingSelf = user.getId().equals(SecurityUtils.currentUserId());
        boolean roleChanges = user.getRoles().stream().noneMatch(existing -> existing.getId().equals(role.getId()))
                || user.getRoles().size() != 1;
        if (editingSelf && (roleChanges || !Boolean.TRUE.equals(request.getActive()))) {
            throw new ForbiddenException("You cannot change your own role or status");
        }

        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPosition(request.getPosition().trim());
        user.setActive(Boolean.TRUE.equals(request.getActive()));

        user.getRoles().clear();
        user.getRoles().add(role);

        if (roleChanges || (wasActive && !Boolean.TRUE.equals(request.getActive()))) {
            sessionService.revokeAllSessions(user, roleChanges ? "ROLES_CHANGED" : "USER_DEACTIVATED");
        }
        User savedUser = userRepository.save(user);
        audit.record(tenantId, SecurityUtils.currentUserId(), roleChanges ? "ROLE_ASSIGNMENT_CHANGED" : "USER_UPDATED",
                "SUCCESS", "USER", userId, "fields=name,email,position,active,role", null);

        return userMapper.toResponse(savedUser);
    }
}