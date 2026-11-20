package com.cubeage.erp.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

/**
 * Per-IP throttling of unauthenticated auth endpoints (SRS 12.9) to blunt credential stuffing,
 * MFA-code guessing, signup abuse and reset-email flooding. Per-account protection is the
 * lockout in {@code AuthService}. Registered inside the Spring Security chain (after CORS) so
 * 429 responses still carry CORS headers.
 *
 * <p>Client IP is {@code request.getRemoteAddr()}. Behind a reverse proxy, configure
 * {@code server.forward-headers-strategy=native} (trusted proxy only) so this is the real client.
 */
@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private record Limit(int max, Duration window) { }

    private static final String PREFIX = "/api/v1/auth/";
    private static final Map<String, Limit> LIMITS = Map.of(
            "login", new Limit(10, Duration.ofMinutes(1)),
            "mfa/verify", new Limit(10, Duration.ofMinutes(1)),
            "signup", new Limit(5, Duration.ofMinutes(10)),
            "forgot-password", new Limit(5, Duration.ofMinutes(15)),
            "reset-password", new Limit(10, Duration.ofMinutes(15)),
            "refresh", new Limit(60, Duration.ofMinutes(1)));

    private final RateLimiter rateLimiter;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !HttpMethod.POST.matches(request.getMethod()) || !request.getRequestURI().startsWith(PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String endpoint = request.getRequestURI().substring(PREFIX.length());
        Limit limit = LIMITS.get(endpoint);
        if (limit != null && !rateLimiter.tryAcquire("ip:" + request.getRemoteAddr() + ":" + endpoint, limit.max(), limit.window())) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(limit.window().toSeconds()));
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"Too Many Requests\",\"status\":429,"
                    + "\"detail\":\"Too many attempts. Please wait and try again.\",\"code\":\"RATE_LIMITED\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
