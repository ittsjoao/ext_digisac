package br.dev.extdigisac.application;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.application.OnboardingService.CredentialsCommand;
import br.dev.extdigisac.application.OnboardingService.GClickInput;
import br.dev.extdigisac.application.OnboardingService.RegisterCommand;
import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.testing.FakeDigisac;
import br.dev.extdigisac.testing.FakeGClick;
import br.dev.extdigisac.testing.FakeSessionTokens;
import br.dev.extdigisac.testing.FakeTenantRepository;
import br.dev.extdigisac.testing.MutableClock;
import br.dev.extdigisac.testing.PlainCipher;
import br.dev.extdigisac.testing.Samples;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class OnboardingServiceTest {

    FakeTenantRepository tenants;
    FakeDigisac digisac;
    FakeGClick gclick;
    PlainCipher cipher;
    GClickIndex index;
    OnboardingService onboarding;

    @BeforeEach
    void setUp() {
        var clock = new MutableClock(Samples.NOW);
        tenants = new FakeTenantRepository();
        digisac = new FakeDigisac();
        gclick = new FakeGClick();
        cipher = new PlainCipher();
        index = new GClickIndex(gclick, clock);
        var access = new TenantAccess(tenants, clock);
        var sessions = new SessionService(tenants, digisac, new FakeSessionTokens(), clock);
        onboarding = new OnboardingService(sessions, tenants, digisac, gclick, cipher, access, index, clock);
        digisac.meByToken.put("sess-admin", new DigisacGateway.Me("u-admin", "Admin", "acc-1", Set.of(), true));
        digisac.meByToken.put("sess-ana", new DigisacGateway.Me("u1", "Ana", "acc-1", Set.of("d1"), false));
        digisac.meByToken.put("tok-acc1", new DigisacGateway.Me("u-api", "API", "acc-1", Set.of(), true));
        digisac.meByToken.put("tok-acc2", new DigisacGateway.Me("u-x", "X", "acc-2", Set.of(), true));
    }

    RegisterCommand register(String token, GClickInput gc) {
        return new RegisterCommand("acme.digisac.co", "sess-admin", " Acme ", token, gc);
    }

    @Test
    void adminRegistersPendingTenantWithEncryptedTokens() {
        Tenant t = onboarding.register(register("tok-acc1", new GClickInput("gc-id", "gc-secret")));

        assertEquals(TenantStatus.PENDENTE, t.status());
        assertEquals("acc-1", t.digisacAccountId());
        assertEquals("Acme", t.name());
        assertEquals("u-admin", t.registeredBy());
        assertNull(t.validUntil());
        assertTrue(t.gclickEnabled());
        assertEquals("tok-acc1", cipher.decrypt(t.digisacTokenEnc()));
        assertEquals("gc-secret", cipher.decrypt(t.gclickSecretEnc()));
        assertTrue(tenants.findByHost("acme.digisac.co").isPresent());
    }

    @Test
    void attendantCannotRegister() {
        var cmd = new RegisterCommand("acme.digisac.co", "sess-ana", "Acme", "tok-acc1", null);
        assertCode(ErrorCode.FORBIDDEN, () -> onboarding.register(cmd));
    }

    @Test
    void tokenFromAnotherAccountIsRejected() {
        assertCode(ErrorCode.ACCOUNT_MISMATCH, () -> onboarding.register(register("tok-acc2", null)));
    }

    @Test
    void rejectedTokensAreValidationErrors() {
        assertCode(ErrorCode.VALIDATION_ERROR, () -> onboarding.register(register("tok-invalido", null)));
        gclick.rejectedClientIds.add("gc-ruim");
        assertCode(ErrorCode.VALIDATION_ERROR,
                () -> onboarding.register(register("tok-acc1", new GClickInput("gc-ruim", "x"))));
    }

    @Test
    void pendingTenantCanResubmitButActiveCannot() {
        Tenant first = onboarding.register(register("tok-acc1", null));
        Tenant again = onboarding.register(register("tok-acc1", null));
        assertEquals(first.id(), again.id());

        tenants.update(again.withStatus(TenantStatus.ATIVA, Samples.NOW));
        assertCode(ErrorCode.VALIDATION_ERROR, () -> onboarding.register(register("tok-acc1", null)));
    }

    @Test
    void newDigisacTokenRestoresInvalidCredentials() {
        Tenant t = onboarding.register(register("tok-acc1", null));
        tenants.update(t.withStatus(TenantStatus.CREDENCIAL_INVALIDA, Samples.NOW));
        digisac.meByToken.put("tok-novo", new DigisacGateway.Me("u-api", "API", "acc-1", Set.of(), true));

        Tenant updated = onboarding.updateCredentials(
                new CredentialsCommand("acme.digisac.co", "sess-admin", "tok-novo", null));

        assertEquals(TenantStatus.ATIVA, updated.status());
        assertEquals("tok-novo", cipher.decrypt(updated.digisacTokenEnc()));
    }

    @Test
    void newGClickCredentialsEnableIntegrationAndDropIndex() {
        Tenant t = onboarding.register(register("tok-acc1", null));
        assertFalse(t.gclickEnabled());

        Tenant updated = onboarding.updateCredentials(
                new CredentialsCommand("acme.digisac.co", "sess-admin", null, new GClickInput("gc-id", "gc-secret")));

        assertTrue(updated.gclickEnabled());
        assertFalse(index.isLoaded(t.id()));
    }

    @Test
    void updateCredentialsNeedsSomethingAndExistingTenant() {
        assertCode(ErrorCode.TENANT_NOT_FOUND, () -> onboarding.updateCredentials(
                new CredentialsCommand("acme.digisac.co", "sess-admin", "tok-acc1", null)));
        onboarding.register(register("tok-acc1", null));
        assertCode(ErrorCode.VALIDATION_ERROR, () -> onboarding.updateCredentials(
                new CredentialsCommand("acme.digisac.co", "sess-admin", " ", null)));
    }
}
