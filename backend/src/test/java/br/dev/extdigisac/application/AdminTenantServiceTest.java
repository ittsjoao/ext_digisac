package br.dev.extdigisac.application;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.application.AdminTenantService.CreateCommand;
import br.dev.extdigisac.application.AdminTenantService.PatchCommand;
import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.testing.FakeDigisac;
import br.dev.extdigisac.testing.FakeGClick;
import br.dev.extdigisac.testing.FakeHistoryRepository;
import br.dev.extdigisac.testing.FakeSessionTokens;
import br.dev.extdigisac.testing.FakeTenantRepository;
import br.dev.extdigisac.testing.MutableClock;
import br.dev.extdigisac.testing.PlainCipher;
import br.dev.extdigisac.testing.Samples;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AdminTenantServiceTest {

    FakeTenantRepository tenants;
    FakeHistoryRepository history;
    FakeDigisac digisac;
    PlainCipher cipher;
    AdminTenantService admin;

    @BeforeEach
    void setUp() {
        var clock = new MutableClock(Samples.NOW);
        tenants = new FakeTenantRepository();
        history = new FakeHistoryRepository();
        digisac = new FakeDigisac();
        var gclick = new FakeGClick();
        cipher = new PlainCipher();
        var access = new TenantAccess(tenants, clock);
        var index = new GClickIndex(gclick, clock);
        var onboarding = new OnboardingService(new SessionService(tenants, digisac, new FakeSessionTokens(), clock),
                tenants, digisac, gclick, cipher, access, index, clock);
        admin = new AdminTenantService(tenants, history, onboarding, cipher, access, index, clock);
        digisac.meByToken.put("tok-acc9", new DigisacGateway.Me("u-api", "API", "acc-9", Set.of(), true));
    }

    @Test
    void listShowsUsageAndExpiry() {
        Tenant t = Samples.tenant("acme.digisac.co", TenantStatus.ATIVA, LocalDate.of(2026, 9, 1));
        tenants.insert(t);
        history.insert(Samples.ticket(t.id(), "u1", Samples.NOW.minus(Duration.ofDays(3))));
        history.insert(Samples.ticket(t.id(), "u1", Samples.NOW.minus(Duration.ofDays(40))));

        var summary = admin.list().get(0);

        assertEquals(1, summary.tickets30d());
        assertTrue(summary.expired());
    }

    @Test
    void ownerCreatesActiveTenantWithAccountFromToken() {
        Tenant t = admin.create(new CreateCommand("NOVA.digisac.co", "Nova", "tok-acc9", null, LocalDate.of(2026, 10, 28)));

        assertEquals("nova.digisac.co", t.host());
        assertEquals("acc-9", t.digisacAccountId());
        assertEquals(TenantStatus.ATIVA, t.status());
        assertEquals("owner", t.registeredBy());
        assertEquals("tok-acc9", cipher.decrypt(t.digisacTokenEnc()));
    }

    @Test
    void duplicateHostIsRejected() {
        tenants.insert(Samples.active("nova.digisac.co"));
        assertCode(ErrorCode.VALIDATION_ERROR,
                () -> admin.create(new CreateCommand("nova.digisac.co", "Nova", "tok-acc9", null, null)));
    }

    @Test
    void patchChangesOnlyInformedFields() {
        Tenant t = Samples.tenant("acme.digisac.co", TenantStatus.PENDENTE, null);
        tenants.insert(t);

        Tenant p = admin.patch(t.id(), new PatchCommand(TenantStatus.ATIVA, LocalDate.of(2026, 10, 28), null, null, "c-notify"));

        assertEquals(TenantStatus.ATIVA, p.status());
        assertEquals("Acme", p.name());
        assertEquals("c-notify", p.notifyContactId());
        assertNull(admin.patch(t.id(), new PatchCommand(null, null, null, null, "")).notifyContactId());
    }

    @Test
    void gclickNeedsCredentialsBeforeEnabling() {
        Tenant t = Samples.active("acme.digisac.co");
        tenants.insert(t);
        assertCode(ErrorCode.VALIDATION_ERROR, () -> admin.patch(t.id(), new PatchCommand(null, null, null, true, null)));
    }

    @Test
    void renewAddsToFutureDateOrStartsToday() {
        Tenant t = Samples.tenant("acme.digisac.co", TenantStatus.ATIVA, LocalDate.of(2026, 10, 10));
        tenants.insert(t);
        assertEquals(LocalDate.of(2026, 11, 9), admin.renew(t.id(), 30).validUntil());

        tenants.update(t.withValidUntil(LocalDate.of(2026, 1, 1), Samples.NOW));
        assertEquals(LocalDate.of(2026, 10, 28), admin.renew(t.id(), 30).validUntil());

        assertCode(ErrorCode.VALIDATION_ERROR, () -> admin.renew(t.id(), 0));
    }

    @Test
    void unknownTenantIsNotFound() {
        assertCode(ErrorCode.NOT_FOUND, () -> admin.renew(UUID.randomUUID(), 30));
    }

    @Test
    void credentialsRestoreInvalidTenant() {
        Tenant t = Samples.tenant("acme.digisac.co", TenantStatus.CREDENCIAL_INVALIDA, null);
        tenants.insert(t);
        digisac.meByToken.put("tok-novo", new DigisacGateway.Me("u-api", "API", "acc-1", Set.of(), true));

        Tenant updated = admin.credentials(t.id(), "tok-novo", null);

        assertEquals(TenantStatus.ATIVA, updated.status());
        assertFalse(updated.gclickEnabled());
    }
}
