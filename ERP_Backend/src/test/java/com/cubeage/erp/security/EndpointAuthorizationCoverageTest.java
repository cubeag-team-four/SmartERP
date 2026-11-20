package com.cubeage.erp.security;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Structural guards over every REST controller, so a new endpoint cannot silently ship
 * without an authorization decision or with client-controlled identity.
 */
class EndpointAuthorizationCoverageTest {

    /** Controllers that are intentionally public (pre-authentication flows). */
    private static final Set<String> PUBLIC_CONTROLLERS = Set.of(
            "com.cubeage.erp.auth.controller.AuthController");

    /** Controllers allowed to accept a tenantId request parameter (Super-Admin-only override, checked in code). */
    private static final Set<String> TENANT_PARAM_ALLOWED = Set.of(
            "com.cubeage.erp.admin.controller.RoleController");

    @Test
    void everyHandlerMethodHasAnExplicitAuthorizationRule() throws Exception {
        List<String> missing = new ArrayList<>();
        for (Class<?> controller : controllers()) {
            if (PUBLIC_CONTROLLERS.contains(controller.getName())) continue;
            boolean classRule = controller.isAnnotationPresent(PreAuthorize.class);
            for (Method m : handlerMethods(controller)) {
                if (!classRule && !m.isAnnotationPresent(PreAuthorize.class)) {
                    missing.add(controller.getSimpleName() + "#" + m.getName());
                }
            }
        }
        assertTrue(missing.isEmpty(), "Endpoints without @PreAuthorize: " + missing);
    }

    @Test
    void noEndpointTakesUserIdentityFromAHeader() throws Exception {
        List<String> offenders = new ArrayList<>();
        for (Class<?> controller : controllers()) {
            for (Method m : handlerMethods(controller)) {
                for (Parameter p : m.getParameters()) {
                    RequestHeader header = p.getAnnotation(RequestHeader.class);
                    if (header == null) continue;
                    String name = !header.value().isEmpty() ? header.value() : header.name();
                    if (name.equalsIgnoreCase("X-User-Id") || name.equalsIgnoreCase("X-User-Name")) {
                        offenders.add(controller.getSimpleName() + "#" + m.getName());
                    }
                }
            }
        }
        assertTrue(offenders.isEmpty(), "Identity must come from the JWT principal, not headers: " + offenders);
    }

    @Test
    void noEndpointLetsTheClientChooseTheTenantViaQueryParameter() throws Exception {
        List<String> offenders = new ArrayList<>();
        for (Class<?> controller : controllers()) {
            if (TENANT_PARAM_ALLOWED.contains(controller.getName())) continue;
            for (Method m : handlerMethods(controller)) {
                for (Parameter p : m.getParameters()) {
                    RequestParam param = p.getAnnotation(RequestParam.class);
                    if (param == null) continue;
                    String name = !param.value().isEmpty() ? param.value() : !param.name().isEmpty() ? param.name() : p.getName();
                    if (name.equals("tenantId")) {
                        offenders.add(controller.getSimpleName() + "#" + m.getName());
                    }
                }
            }
        }
        assertTrue(offenders.isEmpty(), "Tenant must come from the authenticated user: " + offenders);
    }

    private static List<Class<?>> controllers() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        List<Class<?>> result = new ArrayList<>();
        for (var bd : scanner.findCandidateComponents("com.cubeage.erp")) {
            result.add(Class.forName(bd.getBeanClassName()));
        }
        assertTrue(result.size() > 20, "controller scan found too few classes: " + result.size());
        return result;
    }

    private static List<Method> handlerMethods(Class<?> controller) {
        List<Method> result = new ArrayList<>();
        for (Method m : controller.getDeclaredMethods()) {
            if (m.isAnnotationPresent(RequestMapping.class) || m.isAnnotationPresent(GetMapping.class)
                    || m.isAnnotationPresent(PostMapping.class) || m.isAnnotationPresent(PutMapping.class)
                    || m.isAnnotationPresent(PatchMapping.class) || m.isAnnotationPresent(DeleteMapping.class)) {
                result.add(m);
            }
        }
        return result;
    }
}
