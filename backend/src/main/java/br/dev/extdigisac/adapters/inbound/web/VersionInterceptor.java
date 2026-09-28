package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

/** Recusa builds antigos da extensão: as lojas demoram a propagar atualizações. */
public class VersionInterceptor implements HandlerInterceptor {

    private final String minVersion;

    public VersionInterceptor(String minVersion) {
        this.minVersion = minVersion;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!atLeast(request.getHeader("X-Ext-Version"), minVersion)) {
            throw new AppException(ErrorCode.EXTENSION_OUTDATED,
                    "Atualize a extensão para a versão " + minVersion + " ou superior.");
        }
        return true;
    }

    static boolean atLeast(String version, String min) {
        if (version == null) {
            return false;
        }
        try {
            String[] v = version.trim().split("\\.");
            String[] m = min.trim().split("\\.");
            for (int i = 0; i < Math.max(v.length, m.length); i++) {
                int a = i < v.length ? Integer.parseInt(v[i]) : 0;
                int b = i < m.length ? Integer.parseInt(m[i]) : 0;
                if (a != b) {
                    return a > b;
                }
            }
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
