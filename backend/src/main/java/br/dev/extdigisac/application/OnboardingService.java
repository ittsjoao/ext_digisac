package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.application.port.out.SecretCipher;
import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.HostPolicy;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.domain.Texts;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public class OnboardingService {

    public record GClickInput(String clientId, String clientSecret) {
    }

    public record RegisterCommand(String host, String sessionBearer, String name, String digisacToken, GClickInput gclick) {
    }

    public record CredentialsCommand(String host, String sessionBearer, String digisacToken, GClickInput gclick) {
    }

    private final SessionService sessions;
    private final TenantRepository tenants;
    private final DigisacGateway digisac;
    private final GClickGateway gclick;
    private final SecretCipher cipher;
    private final TenantAccess access;
    private final GClickIndex index;
    private final Clock clock;

    public OnboardingService(SessionService sessions, TenantRepository tenants, DigisacGateway digisac,
            GClickGateway gclick, SecretCipher cipher, TenantAccess access, GClickIndex index, Clock clock) {
        this.sessions = sessions;
        this.tenants = tenants;
        this.digisac = digisac;
        this.gclick = gclick;
        this.cipher = cipher;
        this.access = access;
        this.index = index;
        this.clock = clock;
    }

    public Tenant register(RegisterCommand c) {
        String host = HostPolicy.requireValid(c.host());
        DigisacGateway.Me me = requireAdmin(sessions.identify(host, c.sessionBearer()));
        Optional<Tenant> existing = tenants.findByHost(host);
        if (existing.isPresent() && existing.get().status() != TenantStatus.PENDENTE) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Empresa já cadastrada.");
        }
        if (existing.isPresent() && !existing.get().digisacAccountId().equals(me.accountId())) {
            throw new AppException(ErrorCode.ACCOUNT_MISMATCH, "A conta DigiSac não corresponde à empresa cadastrada.");
        }
        String name = Texts.requireText(c.name(), "Informe o nome da empresa.");
        String token = Texts.requireText(c.digisacToken(), "Informe o token de API do DigiSac.");
        verifyDigisacToken(host, token, me.accountId());
        if (c.gclick() != null) {
            verifyGClick(c.gclick());
        }
        Instant now = clock.instant();
        Tenant t = new Tenant(existing.map(Tenant::id).orElseGet(UUID::randomUUID), host, me.accountId(), name,
                TenantStatus.PENDENTE, null, c.gclick() != null, cipher.encrypt(token),
                c.gclick() == null ? null : cipher.encrypt(c.gclick().clientId().trim()),
                c.gclick() == null ? null : cipher.encrypt(c.gclick().clientSecret().trim()),
                null, me.id(), existing.map(Tenant::createdAt).orElse(now), now);
        if (existing.isPresent()) {
            tenants.update(t);
        } else {
            tenants.insert(t);
        }
        return t;
    }

    public Tenant updateCredentials(CredentialsCommand c) {
        String host = HostPolicy.requireValid(c.host());
        DigisacGateway.Me me = requireAdmin(sessions.identify(host, c.sessionBearer()));
        Tenant t = tenants.findByHost(host)
                .orElseThrow(() -> new AppException(ErrorCode.TENANT_NOT_FOUND, "Empresa não cadastrada."));
        if (!t.digisacAccountId().equals(me.accountId())) {
            throw new AppException(ErrorCode.ACCOUNT_MISMATCH, "A conta DigiSac não corresponde à empresa cadastrada.");
        }
        if (Texts.blank(c.digisacToken()) && c.gclick() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Informe ao menos um token.");
        }
        Tenant updated = applyCredentials(t, c.digisacToken(), c.gclick());
        tenants.update(updated);
        access.invalidate(t.id());
        index.evict(t.id());
        return updated;
    }

    /** Valida e cifra os tokens informados; token DigiSac novo tira a empresa de CREDENCIAL_INVALIDA. */
    public Tenant applyCredentials(Tenant t, String digisacToken, GClickInput gc) {
        Instant now = clock.instant();
        byte[] digisacEnc = t.digisacTokenEnc();
        TenantStatus status = t.status();
        if (!Texts.blank(digisacToken)) {
            verifyDigisacToken(t.host(), digisacToken.trim(), t.digisacAccountId());
            digisacEnc = cipher.encrypt(digisacToken.trim());
            if (status == TenantStatus.CREDENCIAL_INVALIDA) {
                status = TenantStatus.ATIVA;
            }
        }
        byte[] gcId = t.gclickClientIdEnc();
        byte[] gcSecret = t.gclickSecretEnc();
        boolean gcEnabled = t.gclickEnabled();
        if (gc != null) {
            verifyGClick(gc);
            gcId = cipher.encrypt(gc.clientId().trim());
            gcSecret = cipher.encrypt(gc.clientSecret().trim());
            gcEnabled = true;
        }
        return t.withCredentials(digisacEnc, gcId, gcSecret, gcEnabled, now).withStatus(status, now);
    }

    public DigisacGateway.Me verifyDigisacToken(String host, String token, String expectedAccountId) {
        DigisacGateway.Me tokenMe;
        try {
            tokenMe = digisac.me(host, token);
        } catch (DigisacGateway.UnauthorizedException e) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Token DigiSac recusado.");
        }
        if (expectedAccountId != null && !expectedAccountId.equals(tokenMe.accountId())) {
            throw new AppException(ErrorCode.ACCOUNT_MISMATCH, "O token DigiSac é de outra conta.");
        }
        return tokenMe;
    }

    public void verifyGClick(GClickInput gc) {
        String id = Texts.requireText(gc.clientId(), "Informe o client_id do G-Click.");
        String secret = Texts.requireText(gc.clientSecret(), "Informe o client_secret do G-Click.");
        try {
            gclick.verify(new GClickGateway.Credentials(id, secret));
        } catch (GClickGateway.UnauthorizedException e) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Credenciais G-Click recusadas.");
        }
    }

    private static DigisacGateway.Me requireAdmin(DigisacGateway.Me me) {
        if (!me.admin()) {
            throw new AppException(ErrorCode.FORBIDDEN, "Apenas administradores do DigiSac podem cadastrar a empresa.");
        }
        return me;
    }
}
