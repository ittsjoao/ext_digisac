package br.dev.extdigisac.application;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.application.port.out.DigisacGateway.Named;
import br.dev.extdigisac.domain.DeptPermission;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.testing.FakeDigisac;
import br.dev.extdigisac.testing.FakeHistoryRepository;
import br.dev.extdigisac.testing.FakePermissionRepository;
import br.dev.extdigisac.testing.FakeTenantRepository;
import br.dev.extdigisac.testing.MutableClock;
import br.dev.extdigisac.testing.PlainCipher;
import br.dev.extdigisac.testing.Samples;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class HistoryAndPermissionServiceTest {

    FakeHistoryRepository historyRepo;
    FakePermissionRepository permissionRepo;
    FakeDigisac digisac;
    HistoryService history;
    PermissionService permissions;
    Tenant tenant;

    @BeforeEach
    void setUp() {
        var clock = new MutableClock(Samples.NOW);
        var tenants = new FakeTenantRepository();
        tenant = Samples.active("acme.digisac.co");
        tenants.insert(tenant);
        var access = new TenantAccess(tenants, clock);
        digisac = new FakeDigisac();
        digisac.services = List.of(new Named("s1", "WhatsApp"));
        digisac.departments = List.of(new Named("d1", "Fiscal"));
        historyRepo = new FakeHistoryRepository();
        permissionRepo = new FakePermissionRepository();
        history = new HistoryService(access, historyRepo, clock);
        permissions = new PermissionService(access, new TenantDigisac(digisac, new PlainCipher(), tenants, access, clock),
                permissionRepo);
    }

    @Test
    void attendantOnlySeesOwnTickets() {
        historyRepo.insert(Samples.ticket(tenant.id(), "u1", Samples.NOW));
        historyRepo.insert(Samples.ticket(tenant.id(), "u2", Samples.NOW));

        var page = history.list(Samples.attendant(tenant.id(), "d1"), new HistoryService.Filter("u2", null, null, null, 0, 50));

        assertEquals("u1", historyRepo.lastQuery.userId());
        assertEquals(1, page.total());
    }

    @Test
    void adminFiltersFreelyAndSizeIsClamped() {
        historyRepo.insert(Samples.ticket(tenant.id(), "u1", Samples.NOW));
        historyRepo.insert(Samples.ticket(tenant.id(), "u2", Samples.NOW));

        var all = history.list(Samples.admin(tenant.id()), new HistoryService.Filter(" ", null, null, null, -3, 5000));

        assertNull(historyRepo.lastQuery.userId());
        assertEquals(100, historyRepo.lastQuery.size());
        assertEquals(0, historyRepo.lastQuery.page());
        assertEquals(2, all.total());
    }

    @Test
    void purgeRemovesOlderThanTwelveMonths() {
        historyRepo.insert(Samples.ticket(tenant.id(), "u1", Samples.NOW.minus(Duration.ofDays(370))));
        historyRepo.insert(Samples.ticket(tenant.id(), "u1", Samples.NOW.minus(Duration.ofDays(300))));
        assertEquals(1, history.purge());
        assertEquals(1, historyRepo.rows.size());
    }

    @Test
    void onlyAdminsManagePermissions() {
        var ana = Samples.attendant(tenant.id(), "d1");
        var rule = new DeptPermission("d1", false, Set.of("s1"), false, Set.of("d1"));
        assertCode(ErrorCode.FORBIDDEN, () -> permissions.get(ana));
        assertCode(ErrorCode.FORBIDDEN, () -> permissions.put(ana, rule));
        assertCode(ErrorCode.FORBIDDEN, () -> permissions.delete(ana, "d1"));
    }

    @Test
    void adminPutsNormalizesAndDeletes() {
        var admin = Samples.admin(tenant.id());

        var saved = permissions.put(admin, new DeptPermission("d1", true, Set.of("s1"), false, Set.of("d1")));
        assertTrue(saved.serviceIds().isEmpty());

        var view = permissions.get(admin);
        assertEquals(1, view.rules().size());
        assertEquals(1, view.services().size());
        assertEquals(1, view.departments().size());

        permissions.delete(admin, "d1");
        assertTrue(permissions.get(admin).rules().isEmpty());
    }

    @Test
    void blankDepartmentIsRejected() {
        assertCode(ErrorCode.VALIDATION_ERROR, () -> permissions.put(Samples.admin(tenant.id()),
                new DeptPermission(" ", false, Set.of(), false, Set.of())));
    }
}
