package com.cubeage.erp.security;

import com.cubeage.erp.admin.entity.Role;
import com.cubeage.erp.admin.entity.User;
import com.cubeage.erp.security.user.UserPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/** Puts a real {@link UserPrincipal} into the security context, as the JWT filter would. */
public final class TestAuth {

    private static final AtomicLong ROLE_IDS = new AtomicLong(1000);

    private TestAuth() { }

    public static User user(long id, long tenantId, String... roleNames) {
        Set<Role> roles = Arrays.stream(roleNames).map(name -> role(tenantId, name)).collect(Collectors.toCollection(HashSet::new));
        return User.builder().id(id).tenantId(tenantId).name("User " + id).email("user" + id + "@t" + tenantId + ".test")
                .position("Staff").passwordHash("x").active(true).roles(roles).build();
    }

    public static Role role(long tenantId, String name) {
        return Role.builder().id(ROLE_IDS.incrementAndGet()).tenantId(tenantId).name(name).build();
    }

    public static UserPrincipal loginAs(long userId, long tenantId, String... roleNames) {
        UserPrincipal principal = UserPrincipal.from(user(userId, tenantId, roleNames));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        return principal;
    }

    public static void clear() {
        SecurityContextHolder.clearContext();
    }
}
