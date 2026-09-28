package br.dev.extdigisac.adapters.inbound.web;

import static java.nio.charset.StandardCharsets.UTF_8;

import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.MessageDigest;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;

public class AdminKeyInterceptor implements HandlerInterceptor {

    private final byte[] key;

    public AdminKeyInterceptor(String adminKey) {
        if (adminKey != null && adminKey.length() < 32) {
            throw new IllegalArgumentException("ADMIN_KEY precisa de pelo menos 32 caracteres");
        }
        this.key = adminKey == null ? new byte[0] : adminKey.getBytes(UTF_8);
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (CorsUtils.isPreFlightRequest(request)) {
            return true;
        }
        String given = request.getHeader("X-Admin-Key");
        if (key.length == 0 || given == null || !MessageDigest.isEqual(key, given.getBytes(UTF_8))) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Chave admin inválida.");
        }
        return true;
    }
}
