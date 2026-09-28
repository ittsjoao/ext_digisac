package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.domain.Actor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

/** Loga só empresa, usuário, rota (padrão, sem query), status e latência. */
public class AccessLogInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger("access");
    private static final String START = "extdigisac.start";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START, System.nanoTime());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        Object start = request.getAttribute(START);
        long ms = start == null ? -1 : (System.nanoTime() - (long) start) / 1_000_000;
        Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        Actor actor = (Actor) request.getAttribute(AuthInterceptor.ACTOR);
        log.info("{} {} {} {}ms tenant={} user={}", request.getMethod(), pattern, response.getStatus(), ms,
                actor == null ? "-" : actor.tenantId(), actor == null ? "-" : actor.userId());
    }
}
