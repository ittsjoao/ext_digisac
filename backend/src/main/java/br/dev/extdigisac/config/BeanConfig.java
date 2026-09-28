package br.dev.extdigisac.config;

import static java.nio.charset.StandardCharsets.UTF_8;

import br.dev.extdigisac.adapters.inbound.web.RateLimiter;
import br.dev.extdigisac.adapters.outbound.crypto.AesGcmCipher;
import br.dev.extdigisac.adapters.outbound.digisac.DigisacRestGateway;
import br.dev.extdigisac.adapters.outbound.gclick.GClickRestGateway;
import br.dev.extdigisac.adapters.outbound.persistence.JdbcHistoryRepository;
import br.dev.extdigisac.adapters.outbound.persistence.JdbcPermissionRepository;
import br.dev.extdigisac.adapters.outbound.persistence.JdbcTenantRepository;
import br.dev.extdigisac.adapters.outbound.session.HmacSessionTokens;
import br.dev.extdigisac.application.AdminTenantService;
import br.dev.extdigisac.application.GClickIndex;
import br.dev.extdigisac.application.GClickService;
import br.dev.extdigisac.application.HistoryService;
import br.dev.extdigisac.application.OnboardingService;
import br.dev.extdigisac.application.PermissionService;
import br.dev.extdigisac.application.SessionService;
import br.dev.extdigisac.application.TenantAccess;
import br.dev.extdigisac.application.TenantDigisac;
import br.dev.extdigisac.application.TicketingService;
import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.application.port.out.PermissionRepository;
import br.dev.extdigisac.application.port.out.SecretCipher;
import br.dev.extdigisac.application.port.out.SessionTokens;
import br.dev.extdigisac.application.port.out.TenantRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestClient;

/** Único ponto que conhece as classes concretas: o núcleo recebe tudo por construtor. */
@Configuration
@EnableScheduling
public class BeanConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    RestClient upstreamRestClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder().requestFactory(factory).build();
    }

    @Bean
    DigisacGateway digisacGateway(RestClient upstreamRestClient) {
        return new DigisacRestGateway(upstreamRestClient);
    }

    @Bean
    GClickGateway gclickGateway(RestClient upstreamRestClient, Clock clock) {
        return new GClickRestGateway(upstreamRestClient, clock);
    }

    @Bean
    SecretCipher secretCipher(AppProperties props) {
        return new AesGcmCipher(Base64.getDecoder().decode(props.masterKey()));
    }

    @Bean
    SessionTokens sessionTokens(AppProperties props, Clock clock) {
        return new HmacSessionTokens(props.sessionSecret().getBytes(UTF_8), clock, props.sessionTtl());
    }

    @Bean
    TenantRepository tenantRepository(JdbcClient jdbc) {
        return new JdbcTenantRepository(jdbc);
    }

    @Bean
    PermissionRepository permissionRepository(JdbcClient jdbc) {
        return new JdbcPermissionRepository(jdbc);
    }

    @Bean
    HistoryRepository historyRepository(JdbcClient jdbc) {
        return new JdbcHistoryRepository(jdbc);
    }

    @Bean
    TenantAccess tenantAccess(TenantRepository tenants, Clock clock) {
        return new TenantAccess(tenants, clock);
    }

    @Bean
    TenantDigisac tenantDigisac(DigisacGateway digisac, SecretCipher cipher, TenantRepository tenants,
            TenantAccess access, Clock clock) {
        return new TenantDigisac(digisac, cipher, tenants, access, clock);
    }

    @Bean
    SessionService sessionService(TenantRepository tenants, DigisacGateway digisac, SessionTokens tokens, Clock clock) {
        return new SessionService(tenants, digisac, tokens, clock);
    }

    @Bean
    GClickIndex gclickIndex(GClickGateway gclick, Clock clock) {
        return new GClickIndex(gclick, clock);
    }

    @Bean
    GClickService gclickService(TenantAccess access, TenantDigisac digisac, GClickIndex index, GClickGateway gclick,
            SecretCipher cipher, Clock clock) {
        return new GClickService(access, digisac, index, gclick, cipher, clock);
    }

    @Bean
    OnboardingService onboardingService(SessionService sessions, TenantRepository tenants, DigisacGateway digisac,
            GClickGateway gclick, SecretCipher cipher, TenantAccess access, GClickIndex index, Clock clock) {
        return new OnboardingService(sessions, tenants, digisac, gclick, cipher, access, index, clock);
    }

    @Bean
    TicketingService ticketingService(TenantAccess access, TenantDigisac digisac, PermissionRepository permissions,
            HistoryRepository history, GClickService gclick, Clock clock) {
        return new TicketingService(access, digisac, permissions, history, gclick, clock);
    }

    @Bean
    HistoryService historyService(TenantAccess access, HistoryRepository history, Clock clock) {
        return new HistoryService(access, history, clock);
    }

    @Bean
    PermissionService permissionService(TenantAccess access, TenantDigisac digisac, PermissionRepository permissions) {
        return new PermissionService(access, digisac, permissions);
    }

    @Bean
    AdminTenantService adminTenantService(TenantRepository tenants, HistoryRepository history,
            OnboardingService onboarding, SecretCipher cipher, TenantAccess access, GClickIndex index, Clock clock) {
        return new AdminTenantService(tenants, history, onboarding, cipher, access, index, clock);
    }

    @Bean
    RateLimiter rateLimiter(AppProperties props, Clock clock) {
        return new RateLimiter(props.rateLimitPerMinute(), clock);
    }

    @Bean
    HistoryPurgeJob historyPurgeJob(HistoryService history) {
        return new HistoryPurgeJob(history);
    }
}
