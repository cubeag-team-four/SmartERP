package com.cubeage.erp.auth.service;

import jakarta.servlet.http.HttpServletRequest;

/** Minimal request metadata kept for audit and session records (no other personal data). */
public record ClientInfo(String ip, String userAgent) {

    public static ClientInfo from(HttpServletRequest request) {
        if (request == null) return new ClientInfo(null, null);
        String ua = request.getHeader("User-Agent");
        if (ua != null && ua.length() > 255) ua = ua.substring(0, 255);
        return new ClientInfo(request.getRemoteAddr(), ua);
    }
}
