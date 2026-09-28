package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.SessionTokens;
import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.HostPolicy;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.Texts;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;

public class SessionService {

    public record Session(SessionTokens.Issued token, Actor actor, Tenant tenant) {
    }

    private final TenantRepository tenants;
    private final DigisacGateway digisac;
    private final SessionTokens tokens;
    private final Clock clock;

    public SessionService(TenantRepository tenants, DigisacGateway digisac, SessionTokens tokens, Clock clock) {
        this.tenants = tenants;
        this.digisac = digisac;
        this.tokens = tokens;
        this.clock = clock;
    }

    public Session exchange(String rawHost, String sessionBearer) {
        String host = HostPolicy.requireValid(rawHost);
        DigisacGateway.Me me = identify(host, sessionBearer);
        Tenant tenant = tenants.findByHost(host).orElseThrow(() -> new AppException(ErrorCode.TENANT_NOT_FOUND,
                "Empresa não cadastrada.", Map.of("canRegister", me.admin())));
        if (!tenant.digisacAccountId().equals(me.accountId())) {
            throw new AppException(ErrorCode.ACCOUNT_MISMATCH, "A conta DigiSac não corresponde à empresa cadastrada.");
        }
        tenant.requireAccess(LocalDate.ofInstant(clock.instant(), Tenant.ZONE));
        Actor actor = new Actor(tenant.id(), me.id(), me.name(), me.departmentIds(), me.admin());
        return new Session(tokens.issue(actor), actor, tenant);
    }

    /** Pergunta ao DigiSac quem é o dono da sessão; o host já deve estar validado. */
    public DigisacGateway.Me identify(String host, String bearer) {
        if (Texts.blank(bearer)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Sessão do DigiSac ausente.");
        }
        String token = bearer.trim().replaceFirst("(?i)^Bearer\\s+", "");
        try {
            return digisac.me(host, token);
        } catch (DigisacGateway.UnauthorizedException e) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Sessão do DigiSac inválida ou expirada.");
        }
    }
}
