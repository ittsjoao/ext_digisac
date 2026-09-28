package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.application.port.out.SecretCipher;
import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.HostPolicy;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.domain.Texts;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AdminTenantService {

    public record TenantSummary(UUID id, String host, String name, TenantStatus status, LocalDate validUntil,
            boolean expired, boolean gclickEnabled, String notifyContactId, String registeredBy, Instant createdAt,
            long tickets30d) {
    }

    public record CreateCommand(String host, String name, String digisacToken, OnboardingService.GClickInput gclick,
            LocalDate validUntil) {
    }

    /** Campo nulo não altera; notifyContactId vazio limpa. */
    public record PatchCommand(TenantStatus status, LocalDate validUntil, String name, Boolean gclickEnabled,
            String notifyContactId) {
    }

    private final TenantRepository tenants;
    private final HistoryRepository history;
    private final OnboardingService onboarding;
    private final SecretCipher cipher;
    private final TenantAccess access;
    private final GClickIndex index;
    private final Clock clock;

    public AdminTenantService(TenantRepository tenants, HistoryRepository history, OnboardingService onboarding,
            SecretCipher cipher, TenantAccess access, GClickIndex index, Clock clock) {
        this.tenants = tenants;
        this.history = history;
        this.onboarding = onboarding;
        this.cipher = cipher;
        this.access = access;
        this.index = index;
        this.clock = clock;
    }

    public List<TenantSummary> list() {
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, Tenant.ZONE);
        Map<UUID, Long> counts = history.countSince(now.minus(Duration.ofDays(30)));
        return tenants.findAll().stream().map(t -> new TenantSummary(t.id(), t.host(), t.name(), t.status(),
                t.validUntil(), t.validUntil() != null && today.isAfter(t.validUntil()), t.gclickEnabled(),
                t.notifyContactId(), t.registeredBy(), t.createdAt(), counts.getOrDefault(t.id(), 0L))).toList();
    }

    public Tenant create(CreateCommand c) {
        String host = HostPolicy.requireValid(c.host());
        if (tenants.findByHost(host).isPresent()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Empresa já cadastrada.");
        }
        String name = Texts.requireText(c.name(), "Informe o nome da empresa.");
        String token = Texts.requireText(c.digisacToken(), "Informe o token de API do DigiSac.");
        DigisacGateway.Me tokenMe = onboarding.verifyDigisacToken(host, token, null);
        if (c.gclick() != null) {
            onboarding.verifyGClick(c.gclick());
        }
        Instant now = clock.instant();
        Tenant t = new Tenant(UUID.randomUUID(), host, tokenMe.accountId(), name, TenantStatus.ATIVA, c.validUntil(),
                c.gclick() != null, cipher.encrypt(token),
                c.gclick() == null ? null : cipher.encrypt(c.gclick().clientId().trim()),
                c.gclick() == null ? null : cipher.encrypt(c.gclick().clientSecret().trim()),
                null, "owner", now, now);
        tenants.insert(t);
        return t;
    }

    public Tenant patch(UUID id, PatchCommand p) {
        Tenant t = find(id);
        Instant now = clock.instant();
        if (p.status() != null) {
            t = t.withStatus(p.status(), now);
        }
        if (p.validUntil() != null) {
            t = t.withValidUntil(p.validUntil(), now);
        }
        boolean gclick = p.gclickEnabled() != null ? p.gclickEnabled() : t.gclickEnabled();
        if (gclick && !t.hasGClickCredentials()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Cadastre as credenciais G-Click antes de ativar a integração.");
        }
        String name = Texts.blank(p.name()) ? t.name() : p.name().trim();
        String notify = p.notifyContactId() == null ? t.notifyContactId() : Texts.blankToNull(p.notifyContactId());
        t = t.withDetails(name, gclick, notify, now);
        tenants.update(t);
        access.invalidate(id);
        if (!gclick) {
            index.evict(id);
        }
        return t;
    }

    public Tenant renew(UUID id, int days) {
        if (days < 1 || days > 366) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Informe entre 1 e 366 dias.");
        }
        Tenant t = find(id);
        Instant now = clock.instant();
        LocalDate until = Tenant.renewedUntil(t.validUntil(), LocalDate.ofInstant(now, Tenant.ZONE), days);
        Tenant renewed = t.withValidUntil(until, now);
        tenants.update(renewed);
        access.invalidate(id);
        return renewed;
    }

    public Tenant credentials(UUID id, String digisacToken, OnboardingService.GClickInput gclick) {
        Tenant t = find(id);
        if (Texts.blank(digisacToken) && gclick == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Informe ao menos um token.");
        }
        Tenant updated = onboarding.applyCredentials(t, digisacToken, gclick);
        tenants.update(updated);
        access.invalidate(id);
        index.evict(id);
        return updated;
    }

    private Tenant find(UUID id) {
        return tenants.findById(id).orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Empresa não encontrada."));
    }
}
