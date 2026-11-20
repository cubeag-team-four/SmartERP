package com.cubeage.erp.auth.controller;

import com.cubeage.erp.auth.dto.*;
import com.cubeage.erp.auth.exception.AuthException;
import com.cubeage.erp.auth.service.AuthService;
import com.cubeage.erp.auth.service.ClientInfo;
import com.cubeage.erp.auth.service.SessionService;
import com.cubeage.erp.auth.service.SignupService;
import com.cubeage.erp.common.response.ApiResponse;
import com.cubeage.erp.security.user.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

/**
 * Authentication API (SRS 8.7). Public endpoints are listed in {@code SecurityConfig}; the rest
 * require a valid access token.
 *
 * <p>The refresh token is never in a response body: it is set as an HttpOnly, Secure,
 * SameSite cookie scoped to {@code /api/v1/auth}, so page scripts (and any XSS) cannot read it.
 * Endpoints that act on that cookie also require {@code X-Requested-With}, which a cross-site
 * form cannot send, as CSRF defence in depth alongside SameSite.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    public static final String REFRESH_COOKIE = "smarterp_rt";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final SignupService signupService;
    private final SessionService sessionService;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AuthController(AuthService authService, SignupService signupService, SessionService sessionService,
                          @Value("${app.security.refresh-cookie.secure:true}") boolean cookieSecure,
                          @Value("${app.security.refresh-cookie.same-site:Strict}") String cookieSameSite) {
        this.authService = authService;
        this.signupService = signupService;
        this.sessionService = sessionService;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    // ------------------------------------------------------------------ public endpoints

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignupResponse>> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(signupService.signup(request, ClientInfo.from(http))));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        AuthService.LoginResult result = authService.login(request, ClientInfo.from(http));
        return withSession(result.body(), result.session());
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<ApiResponse<LoginResponse>> verifyMfa(@Valid @RequestBody MfaVerifyRequest request, HttpServletRequest http) {
        SessionService.IssuedSession session = authService.verifyMfa(request, ClientInfo.from(http));
        return withSession(session.body(), session);
    }

    /** Enrollment start. Public for the login flow (mfaToken), or authenticated from settings. */
    @PostMapping("/mfa/setup")
    public ResponseEntity<ApiResponse<MfaSetupResponse>> mfaSetup(@RequestBody(required = false) MfaTokenRequest request,
                                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(authService.mfaSetup(request == null ? null : request.mfaToken(), principal)));
    }

    @PostMapping("/mfa/enable")
    public ResponseEntity<ApiResponse<LoginResponse>> mfaEnable(@Valid @RequestBody MfaEnableRequest request,
                                                                @AuthenticationPrincipal UserPrincipal principal,
                                                                HttpServletRequest http) {
        AuthService.LoginResult result = authService.mfaEnable(request, principal, ClientInfo.from(http));
        return withSession(result.body(), result.session());
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
                                                              @RequestHeader(value = "X-Requested-With", required = false) String requestedWith,
                                                              HttpServletRequest http) {
        requireXhr(requestedWith);
        try {
            SessionService.IssuedSession session = sessionService.rotate(refreshToken, ClientInfo.from(http));
            return withSession(session.body(), session);
        } catch (AuthException e) {
            // Clear the dead cookie, then let the normal error handler shape the 401.
            throw new ClearCookieAuthException(e, clearCookie());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest http) {
        authService.forgotPassword(request, ClientInfo.from(http));
        return ResponseEntity.accepted().body(ApiResponse.success(null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest http) {
        authService.resetPassword(request, ClientInfo.from(http));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/password-policy")
    public ResponseEntity<ApiResponse<PasswordPolicyResponse>> passwordPolicy() {
        return ResponseEntity.ok(ApiResponse.success(authService.passwordPolicy()));
    }

    // ------------------------------------------------------------ authenticated endpoints

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal UserPrincipal principal,
                                                    @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
                                                    @RequestHeader(value = "X-Requested-With", required = false) String requestedWith,
                                                    HttpServletRequest http) {
        requireXhr(requestedWith);
        authService.logout(principal, refreshToken, ClientInfo.from(http));
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, clearCookie().toString()).body(ApiResponse.success(null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MeResponse>> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(authService.me(principal)));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                                            @Valid @RequestBody ChangePasswordRequest request,
                                                            HttpServletRequest http) {
        authService.changePassword(principal, request, ClientInfo.from(http));
        // Every session (including this one) was revoked; the client must sign in again.
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, clearCookie().toString()).body(ApiResponse.success(null));
    }

    @GetMapping("/mfa/status")
    public ResponseEntity<ApiResponse<MfaStatusResponse>> mfaStatus(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(authService.mfaStatus(principal)));
    }

    @PostMapping("/mfa/recovery-codes")
    public ResponseEntity<ApiResponse<RecoveryCodesResponse>> regenerateRecoveryCodes(@AuthenticationPrincipal UserPrincipal principal,
                                                                                      @Valid @RequestBody MfaCodeRequest request,
                                                                                      HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.success(authService.regenerateRecoveryCodes(principal, request.code(), ClientInfo.from(http))));
    }

    @PostMapping("/mfa/disable")
    public ResponseEntity<ApiResponse<Void>> disableMfa(@AuthenticationPrincipal UserPrincipal principal,
                                                        @Valid @RequestBody MfaDisableRequest request,
                                                        HttpServletRequest http) {
        authService.disableMfa(principal, request, ClientInfo.from(http));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ---------------------------------------------------------------------------- cookies

    private ResponseEntity<ApiResponse<LoginResponse>> withSession(LoginResponse body, SessionService.IssuedSession session) {
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (session != null) {
            response.header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken(), session.refreshTtl()).toString());
        }
        return response.body(ApiResponse.success(body));
    }

    private ResponseCookie refreshCookie(String value, Duration ttl) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true).secure(cookieSecure).sameSite(cookieSameSite).path(COOKIE_PATH).maxAge(ttl).build();
    }

    private ResponseCookie clearCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true).secure(cookieSecure).sameSite(cookieSameSite).path(COOKIE_PATH).maxAge(0).build();
    }

    private static void requireXhr(String requestedWith) {
        if (!"XMLHttpRequest".equals(requestedWith)) {
            throw new AuthException(HttpStatus.FORBIDDEN, "CSRF_HEADER_MISSING", "Missing X-Requested-With header");
        }
    }

    /** Carries a Set-Cookie that clears the refresh cookie on a failed refresh. */
    public static class ClearCookieAuthException extends AuthException {
        private final transient ResponseCookie cookie;

        ClearCookieAuthException(AuthException cause, ResponseCookie cookie) {
            super(cause.getStatus(), cause.getCode(), cause.getMessage());
            this.cookie = cookie;
        }

        public ResponseCookie getCookie() {
            return cookie;
        }
    }
}
