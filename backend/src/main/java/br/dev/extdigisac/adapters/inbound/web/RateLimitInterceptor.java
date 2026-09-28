package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiter limiter;

    public RateLimitInterceptor(RateLimiter limiter) {
        this.limiter = limiter;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!limiter.tryAcquire(clientIp(request))) {
            throw new AppException(ErrorCode.RATE_LIMITED, "Muitas tentativas. Aguarde um minuto.");
        }
        return true;
    }

    /** O Traefik acrescenta o IP real no fim do X-Forwarded-For; o início pode ser forjado pelo cliente. */
    static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) {
            return request.getRemoteAddr();
        }
        String[] parts = xff.split(",");
        return parts[parts.length - 1].trim();
    }
}
