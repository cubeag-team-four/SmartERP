package com.cubeage.erp.auth.exception;

import com.cubeage.erp.auth.controller.AuthController;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthExceptionHandler {

    @ExceptionHandler(AuthException.class)
    ResponseEntity<ProblemDetail> handle(AuthException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(e.getStatus(), e.getMessage());
        problem.setType(URI.create("about:blank"));
        problem.setProperty("code", e.getCode());
        if (e.getTenants() != null) {
            problem.setProperty("tenants", e.getTenants());
        }
        ResponseEntity.BodyBuilder response = ResponseEntity.status(e.getStatus());
        if (e instanceof AuthController.ClearCookieAuthException clear) {
            response.header(HttpHeaders.SET_COOKIE, clear.getCookie().toString());
        }
        return response.body(problem);
    }
}
