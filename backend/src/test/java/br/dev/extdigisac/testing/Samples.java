package br.dev.extdigisac.testing;

import static java.nio.charset.StandardCharsets.UTF_8;

import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.domain.TicketRecord;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public final class Samples {

    public static final Instant NOW = Instant.parse("2026-09-28T12:00:00Z");

    private Samples() {
    }

    /** Token cifrado com o PlainCipher dos testes: decifra para "tok". */
    public static Tenant tenant(String host, TenantStatus status, LocalDate validUntil) {
        return new Tenant(UUID.randomUUID(), host, "acc-1", "Acme", status, validUntil, false,
                "enc:tok".getBytes(UTF_8), null, null, null, "u-admin", NOW, NOW);
    }

    public static Tenant active(String host) {
        return tenant(host, TenantStatus.ATIVA, null);
    }

    public static Actor attendant(UUID tenantId, String... deptIds) {
        return new Actor(tenantId, "u1", "Ana", Set.of(deptIds), false);
    }

    public static Actor admin(UUID tenantId) {
        return new Actor(tenantId, "u-admin", "Admin", Set.of(), true);
    }

    public static TicketRecord ticket(UUID tenantId, String userId, Instant at) {
        return new TicketRecord(UUID.randomUUID(), tenantId, userId, "Ana", "c1", "Cliente", "s1", "d1",
                null, null, false, at);
    }
}
