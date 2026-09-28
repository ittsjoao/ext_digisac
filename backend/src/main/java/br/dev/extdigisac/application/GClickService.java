package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.application.port.out.GClickGateway.Client;
import br.dev.extdigisac.application.port.out.GClickGateway.Credentials;
import br.dev.extdigisac.application.port.out.GClickGateway.Responsavel;
import br.dev.extdigisac.application.port.out.SecretCipher;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.PhoneKey;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.Texts;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class GClickService {

    /** Formato de /plataforma-atendimento/clientes do g2api, usado pelo padronizador do embed. */
    public record Match(long id, String apelido, String nome, String status, boolean possuiAcesso, String integra) {
    }

    static final Duration MISS_COOLDOWN = Duration.ofMinutes(10);
    private static final int SEARCH_LIMIT = 20;

    private final TenantAccess access;
    private final TenantDigisac digisac;
    private final GClickIndex index;
    private final GClickGateway gclick;
    private final SecretCipher cipher;
    private final Clock clock;
    private final Map<UUID, Instant> lastMissReload = new ConcurrentHashMap<>();

    public GClickService(TenantAccess access, TenantDigisac digisac, GClickIndex index, GClickGateway gclick,
            SecretCipher cipher, Clock clock) {
        this.access = access;
        this.digisac = digisac;
        this.index = index;
        this.gclick = gclick;
        this.cipher = cipher;
        this.clock = clock;
    }

    public List<Client> search(Actor actor, String q) {
        Tenant t = enabledTenant(actor);
        String term = fold(q).trim();
        if (term.length() < 2) {
            return List.of();
        }
        String digits = term.replaceAll("\\D", "");
        String key = PhoneKey.of(term);
        return guard(() -> index.clients(t.id(), credentials(t))).stream()
                .filter(c -> !c.telefones().isEmpty())
                .filter(c -> matches(c, term, digits, key))
                .sorted(Comparator.comparing(Client::nome))
                .limit(SEARCH_LIMIT)
                .toList();
    }

    public List<Responsavel> responsaveis(Actor actor, long clienteId) {
        Tenant t = enabledTenant(actor);
        return guard(() -> gclick.responsaveis(credentials(t), clienteId));
    }

    public List<Match> match(Actor actor, String contactId) {
        Tenant t = enabledTenant(actor);
        Optional<DigisacGateway.Contact> contact = digisac.call(t, (d, a) -> d.contact(a, contactId));
        String key = PhoneKey.of(contact.map(DigisacGateway.Contact::number).orElse(""));
        if (key.length() < 8) {
            return List.of();
        }
        Credentials creds = credentials(t);
        List<Client> found = byPhone(guard(() -> index.clients(t.id(), creds)), key);
        Instant now = clock.instant();
        Instant last = lastMissReload.get(t.id());
        // ponytail: cliente novo no G-Click só aparece após reindexar; o cooldown evita reindexar a cada contato desconhecido
        if (found.isEmpty() && (last == null || now.isAfter(last.plus(MISS_COOLDOWN)))) {
            lastMissReload.put(t.id(), now);
            found = byPhone(guard(() -> index.reload(t.id(), creds)), key);
        }
        return found.stream()
                .map(c -> new Match(c.id(), Texts.blank(c.apelido()) ? c.nome() : c.apelido(), c.nome(),
                        Texts.blank(c.status()) ? "ATIVO" : c.status(), true, ""))
                .toList();
    }

    public GClickIndex.Progress progress(Actor actor) {
        return index.progress(enabledTenant(actor).id());
    }

    /** Nome do cliente para o histórico; vazio se a empresa não usa G-Click. */
    public Optional<String> clientName(Tenant t, long clienteId) {
        if (!t.gclickEnabled() || !t.hasGClickCredentials()) {
            return Optional.empty();
        }
        return guard(() -> index.clients(t.id(), credentials(t))).stream()
                .filter(c -> c.id() == clienteId).map(Client::nome).findFirst();
    }

    static boolean matches(Client c, String term, String digits, String key) {
        if (fold(c.nome()).contains(term) || fold(c.apelido()).contains(term)) {
            return true;
        }
        if (digits.length() >= 3 && c.inscricao().replaceAll("\\D", "").contains(digits)) {
            return true;
        }
        return key.length() >= 8 && c.telefones().stream().anyMatch(p -> PhoneKey.of(p.numero()).endsWith(key));
    }

    private static List<Client> byPhone(List<Client> clients, String key) {
        return clients.stream()
                .filter(c -> c.telefones().stream().anyMatch(p -> PhoneKey.of(p.numero()).equals(key)))
                .toList();
    }

    private Tenant enabledTenant(Actor actor) {
        Tenant t = access.requireActive(actor.tenantId());
        if (!t.gclickEnabled() || !t.hasGClickCredentials()) {
            throw new AppException(ErrorCode.FORBIDDEN, "Integração G-Click desativada para esta empresa.");
        }
        return t;
    }

    private Credentials credentials(Tenant t) {
        return new Credentials(cipher.decrypt(t.gclickClientIdEnc()), cipher.decrypt(t.gclickSecretEnc()));
    }

    private static <T> T guard(Supplier<T> fn) {
        try {
            return fn.get();
        } catch (GClickGateway.UnauthorizedException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR,
                    "Credenciais G-Click recusadas; o administrador precisa atualizá-las.");
        }
    }

    static String fold(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
