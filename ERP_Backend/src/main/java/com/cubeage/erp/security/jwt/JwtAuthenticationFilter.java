package com.cubeage.erp.security.jwt;

import com.cubeage.erp.security.user.CustomUserDetailsService;
import com.cubeage.erp.security.user.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Authenticates requests carrying {@code Authorization: Bearer <access token>}.
 *
 * <p>The user is reloaded from the database on every request, so a token stops working as
 * soon as the account is deactivated or its {@code token_version} is bumped (logout, password
 * change/reset, role change, MFA reset). A login lockout deliberately does NOT end existing
 * sessions, so an attacker cannot sign the real user out by failing logins on purpose.
 * MFA-pending tokens are never accepted here.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")
                || SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        jwtService.parseAccessToken(header.substring(7)).ifPresent(claims -> {
            try {
                UserPrincipal principal = userDetailsService.loadById(claims.userId());
                boolean current = principal.getTenantId().equals(claims.tenantId())
                        && principal.getTokenVersion() == claims.tokenVersion();
                if (current) {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (UsernameNotFoundException inactiveOrDeleted) {
                SecurityContextHolder.clearContext();
            }
        });
        filterChain.doFilter(request, response);
    }
}
