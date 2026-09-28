package br.dev.extdigisac.application;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.application.TicketingService.OpenTicketCommand;
import br.dev.extdigisac.application.TicketingService.RegisterContactCommand;
import br.dev.extdigisac.application.TicketingService.RegisterOutcome;
import br.dev.extdigisac.application.port.out.DigisacGateway.Contact;
import br.dev.extdigisac.application.port.out.DigisacGateway.Named;
import br.dev.extdigisac.application.port.out.DigisacGateway.OpenTicket;
import br.dev.extdigisac.application.port.out.DigisacGateway.User;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.DeptPermission;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.testing.FakeDigisac;
import br.dev.extdigisac.testing.FakeGClick;
import br.dev.extdigisac.testing.FakeHistoryRepository;
import br.dev.extdigisac.testing.FakePermissionRepository;
import br.dev.extdigisac.testing.FakeTenantRepository;
import br.dev.extdigisac.testing.MutableClock;
import br.dev.extdigisac.testing.PlainCipher;
import br.dev.extdigisac.testing.Samples;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TicketingServiceTest {

    FakeTenantRepository tenants;
    FakeDigisac digisac;
    FakePermissionRepository permissions;
    FakeHistoryRepository history;
    TicketingService service;
    Tenant tenant;
    Actor ana;

    @BeforeEach
    void setUp() {
        var clock = new MutableClock(Samples.NOW);
        tenants = new FakeTenantRepository();
        tenant = Samples.active("acme.digisac.co");
        tenants.insert(tenant);
        digisac = new FakeDigisac();
        digisac.services = List.of(new Named("s1", "WhatsApp Fiscal"), new Named("s2", "WhatsApp Comercial"));
        digisac.departments = List.of(new Named("d1", "Fiscal"), new Named("d2", "Comercial"));
        digisac.users = List.of(new User("u9", "Bia", "bia@x", List.of(new Named("d2", "Comercial"))));
        digisac.tags.put("VALIDO", "tag-valido");
        permissions = new FakePermissionRepository();
        permissions.upsert(tenant.id(), new DeptPermission("d1", false, Set.of("s1"), false, Set.of("d1")), "u-admin");
        history = new FakeHistoryRepository();
        var cipher = new PlainCipher();
        var access = new TenantAccess(tenants, clock);
        var td = new TenantDigisac(digisac, cipher, tenants, access, clock);
        var gclick = new GClickService(access, td, new GClickIndex(new FakeGClick(), clock), new FakeGClick(), cipher, clock);
        service = new TicketingService(access, td, permissions, history, gclick, clock);
        ana = Samples.attendant(tenant.id(), "d1");
    }

    @Test
    void catalogIsFilteredForAttendant() {
        var catalog = service.catalog(ana);
        assertEquals(List.of(new Named("s1", "WhatsApp Fiscal")), catalog.services());
        assertEquals(List.of(new Named("d1", "Fiscal")), catalog.departments());
        assertEquals(1, catalog.users().size());
    }

    @Test
    void adminSeesTheWholeCatalog() {
        var catalog = service.catalog(Samples.admin(tenant.id()));
        assertEquals(2, catalog.services().size());
        assertEquals(2, catalog.departments().size());
    }

    @Test
    void contactsOfForbiddenServiceAreRefused() {
        assertCode(ErrorCode.FORBIDDEN, () -> service.contacts(ana, "s2"));
    }

    @Test
    void registerCreatesContactWithValidoTagAndCountryCode() {
        var r = service.registerContact(ana, new RegisterContactCommand("s1", "Padaria", "(34) 3236-9899", "d1"));

        assertEquals(RegisterOutcome.CREATED, r.outcome());
        assertEquals("553432369899", digisac.created.get(0).get("number"));
        assertEquals("tag-valido", digisac.created.get(0).get("tagId"));
    }

    @Test
    void registerUpdatesExistingContactWithoutTags() {
        digisac.contacts.put("c1", new Contact("c1", "5534999998888", null, "s1", "5534999998888", List.of()));

        var r = service.registerContact(ana, new RegisterContactCommand("s1", "Padaria", "(34) 99999-8888", null));

        assertEquals(RegisterOutcome.UPDATED, r.outcome());
        assertEquals("c1", r.contactId());
        assertEquals("Padaria", digisac.updated.get(0).get("internalName"));
    }

    @Test
    void registerRefusesDuplicateWithTagsAndNotifies() {
        tenants.update(tenant.withDetails("Acme", false, "c-notify", Samples.NOW));
        digisac.contacts.put("c1", new Contact("c1", "X", null, "s1", "5534999998888", List.of("CLIENTE")));

        assertCode(ErrorCode.DUPLICATE_CONTACT,
                () -> service.registerContact(ana, new RegisterContactCommand("s1", "Padaria", "34999998888", "d1")));

        assertEquals("c-notify", digisac.messages.get(0).get("contactId"));
        assertTrue(digisac.messages.get(0).get("text").contains("Tentativa de Cadastro Duplicado"));
        assertTrue(digisac.messages.get(0).get("text").contains("Fiscal"));
        assertTrue(digisac.messages.get(0).get("text").contains("28/09/2026 09:00"));
    }

    @Test
    void registerWithoutNotifyContactSendsNothing() {
        service.registerContact(ana, new RegisterContactCommand("s1", "Padaria", "34999998888", "d1"));
        assertTrue(digisac.messages.isEmpty());
    }

    @Test
    void registerNeedsValidoTag() {
        digisac.tags.clear();
        assertCode(ErrorCode.VALIDATION_ERROR,
                () -> service.registerContact(ana, new RegisterContactCommand("s1", "Padaria", "34999998888", null)));
    }

    @Test
    void openTicketTransfersAndRecordsHistory() {
        digisac.contacts.put("c1", new Contact("c1", "Joao", "Padaria", "s1", "5534999998888", List.of("VALIDO")));

        var r = service.openTicket(ana, new OpenTicketCommand("s1", "c1", "d1", " ", "urgente", null));

        assertEquals("d1", digisac.transfers.get(0).get("departmentId"));
        assertNull(digisac.transfers.get(0).get("userId"));
        assertEquals("urgente", digisac.transfers.get(0).get("comments"));
        assertEquals("Padaria", r.contactName());
        assertTrue(r.hadComment());
        assertEquals(1, history.rows.size());
        assertEquals("u1", history.rows.get(0).userId());
    }

    @Test
    void openTicketChecksTargetAndContactService() {
        digisac.contacts.put("c1", new Contact("c1", "Joao", null, "s2", "5534999998888", List.of()));
        assertCode(ErrorCode.FORBIDDEN, () -> service.openTicket(ana, new OpenTicketCommand("s1", "c1", "d2", null, null, null)));
        assertCode(ErrorCode.FORBIDDEN, () -> service.openTicket(ana, new OpenTicketCommand("s1", "c1", "d1", null, null, null)));
        assertCode(ErrorCode.NOT_FOUND, () -> service.openTicket(ana, new OpenTicketCommand("s1", "c404", "d1", null, null, null)));
        assertTrue(digisac.transfers.isEmpty());
    }

    @Test
    void openTicketRefusesWhenAlreadyOpen() {
        digisac.contacts.put("c1", new Contact("c1", "Joao", null, "s1", "5534999998888", List.of()));
        digisac.openTickets.put("c1", new OpenTicket("u9", "d2"));

        var e = assertCode(ErrorCode.OPEN_TICKET_EXISTS,
                () -> service.openTicket(ana, new OpenTicketCommand("s1", "c1", "d1", null, null, null)));

        assertEquals("Este contato já possui um chamado em aberto com Bia do departamento Comercial.", e.getMessage());
        assertFalse(history.rows.size() > 0);
    }

    @Test
    void openTicketOfDescribesWhoAttends() {
        digisac.openTickets.put("c1", new OpenTicket("u-sumiu", "d2"));
        var info = service.openTicketOf(ana, "c1").orElseThrow();
        assertEquals("usuário desconhecido", info.userName());
        assertEquals("Comercial", info.departmentName());
    }
}
