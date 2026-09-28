package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.TenantAccess;
import br.dev.extdigisac.application.port.out.SessionTokens;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

/** Valida o token de sessão e a licença da empresa em toda request autenticada. */
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ACTOR = "extdigisac.actor";

    private final SessionTokens tokens;
    private final TenantAccess access;

    public AuthInterceptor(SessionTokens tokens, TenantAccess access) {
        this.tokens = tokens;
        this.access = access;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Sessão ausente.");
        }
        Actor actor = tokens.verify(header.substring(7).trim());
        access.requireActive(actor.tenantId());
        request.setAttribute(ACTOR, actor);
        return true;
    }
}
