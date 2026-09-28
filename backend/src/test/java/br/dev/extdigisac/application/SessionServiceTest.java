package br.dev.extdigisac.application;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.testing.FakeDigisac;
import br.dev.extdigisac.testing.FakeSessionTokens;
import br.dev.extdigisac.testing.FakeTenantRepository;
import br.dev.extdigisac.testing.MutableClock;
import br.dev.extdigisac.testing.PlainCipher;
import br.dev.extdigisac.testing.Samples;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SessionServiceTest {

    MutableClock clock;
    FakeTenantRepository tenants;
    FakeDigisac digisac;
    SessionService sessions;
    TenantAccess access;
    Tenant tenant;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Samples.NOW);
        tenants = new FakeTenantRepository();
        digisac = new FakeDigisac();
        sessions = new SessionService(tenants, digisac, new FakeSessionTokens(), clock);
        access = new TenantAccess(tenants, clock);
        tenant = Samples.active("acme.digisac.co");
        tenants.insert(tenant);
        digisac.meByToken.put("sess-ana", new DigisacGateway.Me("u1", "Ana", "acc-1", Set.of("d1"), false));
        digisac.meByToken.put("sess-admin", new DigisacGateway.Me("u-admin", "Admin", "acc-1", Set.of(), true));
        digisac.meByToken.put("sess-other", new DigisacGateway.Me("u7", "Outro", "acc-2", Set.of(), false));
    }

    @Test
    void exchangeBuildsActorFromMe() {
        var s = sessions.exchange("ACME.digisac.co", "sess-ana");
        assertEquals(tenant.id(), s.actor().tenantId());
        assertEquals("u1", s.actor().userId());
        assertEquals(Set.of("d1"), s.actor().deptIds());
        assertEquals("tok:u1", s.token().token());
    }

    @Test
    void bearerPrefixIsAccepted() {
        assertEquals("u1", sessions.exchange("acme.digisac.co", "Bearer sess-ana").actor().userId());
    }

    @Test
    void invalidHostFailsBeforeCallingDigisac() {
        digisac.meByToken.clear();
        assertCode(ErrorCode.INVALID_HOST, () -> sessions.exchange("evil.com", "sess-ana"));
    }

    @Test
    void rejectedSessionIsUnauthenticated() {
        assertCode(ErrorCode.UNAUTHENTICATED, () -> sessions.exchange("acme.digisac.co", "sess-velha"));
        assertCode(ErrorCode.UNAUTHENTICATED, () -> sessions.exchange("acme.digisac.co", " "));
    }

    @Test
    void unknownTenantSaysWhetherUserCanRegister() {
        AppException admin = assertCode(ErrorCode.TENANT_NOT_FOUND, () -> sessions.exchange("nova.digisac.co", "sess-admin"));
        assertEquals(true, admin.details().get("canRegister"));
        AppException user = assertCode(ErrorCode.TENANT_NOT_FOUND, () -> sessions.exchange("nova.digisac.co", "sess-ana"));
        assertEquals(false, user.details().get("canRegister"));
    }

    @Test
    void otherAccountOnSameHostIsRejected() {
        assertCode(ErrorCode.ACCOUNT_MISMATCH, () -> sessions.exchange("acme.digisac.co", "sess-other"));
    }

    @Test
    void pendingAndExpiredTenantsAreDenied() {
        tenants.update(tenant.withStatus(TenantStatus.PENDENTE, Samples.NOW));
        assertCode(ErrorCode.TENANT_PENDING, () -> sessions.exchange("acme.digisac.co", "sess-ana"));

        tenants.update(tenant.withValidUntil(LocalDate.of(2026, 9, 27), Samples.NOW));
        assertCode(ErrorCode.LICENSE_EXPIRED, () -> sessions.exchange("acme.digisac.co", "sess-ana"));
    }

    @Test
    void tenantAccessCachesForSixtySeconds() {
        access.requireActive(tenant.id());
        tenants.update(tenant.withStatus(TenantStatus.BLOQUEADA, Samples.NOW));

        clock.advance(Duration.ofSeconds(59));
        access.requireActive(tenant.id());

        clock.advance(Duration.ofSeconds(2));
        assertCode(ErrorCode.TENANT_BLOCKED, () -> access.requireActive(tenant.id()));
    }

    @Test
    void invalidateForcesReload() {
        access.requireActive(tenant.id());
        tenants.update(tenant.withStatus(TenantStatus.BLOQUEADA, Samples.NOW));
        access.invalidate(tenant.id());
        assertCode(ErrorCode.TENANT_BLOCKED, () -> access.requireActive(tenant.id()));
    }

    @Test
    void rejectedCompanyTokenMarksCredentialInvalid() {
        var td = new TenantDigisac(digisac, new PlainCipher(), tenants, access, clock);
        digisac.rejectedTokens.add("tok");

        assertCode(ErrorCode.CREDENTIAL_INVALID, () -> td.call(tenant, DigisacGateway::services));

        assertEquals(TenantStatus.CREDENCIAL_INVALIDA, tenants.findById(tenant.id()).orElseThrow().status());
        assertCode(ErrorCode.CREDENTIAL_INVALID, () -> access.requireActive(tenant.id()));
    }

    @Test
    void companyTokenIsDecryptedForCalls() {
        var td = new TenantDigisac(digisac, new PlainCipher(), tenants, access, clock);
        digisac.services.add(new DigisacGateway.Named("s1", "WhatsApp"));
        assertTrue(td.call(tenant, DigisacGateway::services).size() == 1);
    }
}
