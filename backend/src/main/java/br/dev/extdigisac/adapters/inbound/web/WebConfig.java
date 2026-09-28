package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.TenantAccess;
import br.dev.extdigisac.application.port.out.SessionTokens;
import br.dev.extdigisac.config.AppProperties;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final SessionTokens tokens;
    private final TenantAccess access;
    private final RateLimiter limiter;
    private final AppProperties props;

    public WebConfig(SessionTokens tokens, TenantAccess access, RateLimiter limiter, AppProperties props) {
        this.tokens = tokens;
        this.access = access;
        this.limiter = limiter;
        this.props = props;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AccessLogInterceptor());
        registry.addInterceptor(new VersionInterceptor(props.minExtVersion()))
                .excludePathPatterns("/admin/**", "/actuator/**", "/error");
        registry.addInterceptor(new RateLimitInterceptor(limiter))
                .addPathPatterns("/auth/session", "/tenants", "/tenants/credentials");
        registry.addInterceptor(new AdminKeyInterceptor(props.adminKey()))
                .addPathPatterns("/admin/**");
        registry.addInterceptor(new AuthInterceptor(tokens, access))
                .excludePathPatterns("/auth/**", "/tenants", "/tenants/**", "/admin/**", "/actuator/**", "/error");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new ActorArgumentResolver());
    }

    /** Só o painel local (admin/panel.html servido em localhost) chama o backend de um navegador comum. */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/admin/**")
                .allowedOrigins(props.adminOrigin())
                .allowedMethods("GET", "POST", "PATCH", "PUT")
                .allowedHeaders("X-Admin-Key", "Content-Type");
    }
}
