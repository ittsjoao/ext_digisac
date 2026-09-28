package br.dev.extdigisac.application;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.testing.FakeDigisac;
import br.dev.extdigisac.testing.FakeGClick;
import br.dev.extdigisac.testing.FakeTenantRepository;
import br.dev.extdigisac.testing.MutableClock;
import br.dev.extdigisac.testing.PlainCipher;
import br.dev.extdigisac.testing.Samples;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GClickServiceTest {

    MutableClock clock;
    FakeTenantRepository tenants;
    FakeDigisac digisac;
    FakeGClick gclick;
    GClickIndex index;
    GClickService service;
    Tenant tenant;
    Actor ana;

    static GClickGateway.Client client(long id, String nome, String inscricao, String... phones) {
        List<GClickGateway.Phone> list = new ArrayList<>();
        for (String p : phones) {
            list.add(new GClickGateway.Phone("Tel", p));
        }
        return new GClickGateway.Client(id, nome, "", "ATIVO", inscricao, list);
    }

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Samples.NOW);
        tenants = new FakeTenantRepository();
        digisac = new FakeDigisac();
        gclick = new FakeGClick();
        var cipher = new PlainCipher();
        Tenant base = Samples.active("acme.digisac.co");
        tenant = base.withCredentials(base.digisacTokenEnc(), cipher.encrypt("gc-id"), cipher.encrypt("gc-secret"), true, Samples.NOW);
        tenants.insert(tenant);
        var access = new TenantAccess(tenants, clock);
        index = new GClickIndex(gclick, clock);
        service = new GClickService(access, new TenantDigisac(digisac, cipher, tenants, access, clock), index, gclick, cipher, clock);
        ana = Samples.attendant(tenant.id(), "d1");
        for (int i = 0; i < 250; i++) {
            gclick.all.add(client(i, "Empresa " + i, "00.000.000/0001-" + i, "(34) 3000-" + String.format("%04d", i)));
        }
        gclick.all.add(client(900, "Padaria São João", "12.345.678/0001-99", "(34) 99999-8888"));
        gclick.all.add(client(901, "Sem Telefone", "98.765.432/0001-11"));
    }

    @Test
    void indexLoadsAllPagesOnceAndCaches() {
        assertEquals(1, service.search(ana, "padaria").size());
        assertEquals(3, gclick.pageCalls.get());
        service.search(ana, "empresa");
        assertEquals(3, gclick.pageCalls.get());
        var progress = service.progress(ana);
        assertEquals(252, progress.loaded());
        assertEquals(252, progress.total());
        assertFalse(progress.running());
    }

    @Test
    void searchIsAccentInsensitiveAndMatchesCnpjAndPhone() {
        assertEquals(900L, service.search(ana, "sao joao").get(0).id());
        assertEquals(900L, service.search(ana, "12345678").get(0).id());
        assertEquals(900L, service.search(ana, "99998888").get(0).id());
    }

    @Test
    void searchSkipsClientsWithoutPhonesLimitsAndSorts() {
        assertTrue(service.search(ana, "sem telefone").isEmpty());
        var results = service.search(ana, "empresa");
        assertEquals(20, results.size());
        assertEquals("Empresa 0", results.get(0).nome());
        assertTrue(service.search(ana, "a").isEmpty());
    }

    @Test
    void disabledTenantIsForbidden() {
        tenants.update(tenant.withDetails("Acme", false, null, Samples.NOW));
        var access = new TenantAccess(tenants, clock);
        var cipher = new PlainCipher();
        var svc = new GClickService(access, new TenantDigisac(digisac, cipher, tenants, access, clock),
                new GClickIndex(gclick, clock), gclick, cipher, clock);
        assertCode(ErrorCode.FORBIDDEN, () -> svc.search(ana, "padaria"));
    }

    @Test
    void matchFindsClientByContactPhone() {
        digisac.contacts.put("c1", new DigisacGateway.Contact("c1", "Joao", null, "s1", "5534999998888", List.of()));
        var matches = service.match(ana, "c1");
        assertEquals(1, matches.size());
        assertEquals(900L, matches.get(0).id());
        assertEquals("Padaria São João", matches.get(0).apelido());
        assertTrue(matches.get(0).possuiAcesso());
    }

    @Test
    void matchMissReloadsOncePerCooldown() {
        digisac.contacts.put("c2", new DigisacGateway.Contact("c2", "Novo", null, "s1", "5534988887777", List.of()));
        service.match(ana, "c2");
        assertEquals(6, gclick.pageCalls.get());
        service.match(ana, "c2");
        assertEquals(6, gclick.pageCalls.get());
        clock.advance(Duration.ofMinutes(11));
        service.match(ana, "c2");
        assertEquals(9, gclick.pageCalls.get());
    }

    @Test
    void staleIndexIsServedWhileRefreshing() throws InterruptedException {
        service.search(ana, "padaria");
        clock.advance(Duration.ofHours(7));
        assertEquals(1, service.search(ana, "padaria").size());
        for (int i = 0; i < 100 && gclick.pageCalls.get() < 6; i++) {
            Thread.sleep(20);
        }
        assertEquals(6, gclick.pageCalls.get());
    }

    @Test
    void evictDropsTheIndex() {
        service.search(ana, "padaria");
        index.evict(tenant.id());
        assertFalse(index.isLoaded(tenant.id()));
        service.search(ana, "padaria");
        assertEquals(6, gclick.pageCalls.get());
    }

    @Test
    void rejectedCredentialsBecomeUpstreamError() {
        gclick.rejectedClientIds.add("gc-id");
        assertCode(ErrorCode.UPSTREAM_ERROR, () -> service.search(ana, "padaria"));
    }

    @Test
    void clientNameForHistory() {
        assertEquals("Padaria São João", service.clientName(tenant, 900).orElseThrow());
        assertTrue(service.clientName(tenant, 12345).isEmpty());
    }

    @Test
    void responsaveisPassThrough() {
        gclick.responsaveis.put(900L, List.of(new GClickGateway.Responsavel(1, "Bia", "b@x", new GClickGateway.Cargo("Fiscal - Líder"))));
        assertEquals("Bia", service.responsaveis(ana, 900).get(0).nome());
    }

    @Test
    void evictThenLoadUsesFreshData() {
        service.search(ana, "padaria");
        gclick.all.add(client(902, "Novissima Empresa", "11.222.333/0001-44", "(34) 98888-7777"));
        index.evict(tenant.id());
        var results = service.search(ana, "novissima");
        assertEquals(1, results.size());
        assertEquals(902L, results.get(0).id());
    }
}
