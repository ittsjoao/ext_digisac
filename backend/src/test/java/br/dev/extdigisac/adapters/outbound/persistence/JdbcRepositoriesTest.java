package br.dev.extdigisac.adapters.outbound.persistence;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.TestcontainersConfiguration;
import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.domain.DeptPermission;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.testing.Samples;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class JdbcRepositoriesTest {

    @Autowired
    JdbcClient jdbc;

    JdbcTenantRepository tenants;
    JdbcPermissionRepository permissions;
    JdbcHistoryRepository history;

    @BeforeEach
    void setUp() {
        jdbc.sql("DELETE FROM tenant").update();
        tenants = new JdbcTenantRepository(jdbc);
        permissions = new JdbcPermissionRepository(jdbc);
        history = new JdbcHistoryRepository(jdbc);
    }

    @Test
    void tenantRoundTripWithNullsAndBytes() {
        Tenant t = Samples.tenant("acme.digisac.co", TenantStatus.PENDENTE, null);
        tenants.insert(t);

        Tenant found = tenants.findByHost("acme.digisac.co").orElseThrow();
        assertEquals(t.id(), found.id());
        assertEquals(TenantStatus.PENDENTE, found.status());
        assertNull(found.validUntil());
        assertNull(found.gclickClientIdEnc());
        assertArrayEquals(t.digisacTokenEnc(), found.digisacTokenEnc());
        assertEquals(Samples.NOW, found.createdAt());
    }

    @Test
    void tenantUpdate() {
        Tenant t = Samples.active("acme.digisac.co");
        tenants.insert(t);
        Tenant changed = t.withValidUntil(LocalDate.of(2026, 10, 28), Samples.NOW.plusSeconds(5))
                .withCredentials(t.digisacTokenEnc(), new byte[] {1}, new byte[] {2}, true, Samples.NOW.plusSeconds(5))
                .withDetails("Acme Ltda", true, "c-notify", Samples.NOW.plusSeconds(5));
        tenants.update(changed);

        Tenant found = tenants.findById(t.id()).orElseThrow();
        assertEquals(LocalDate.of(2026, 10, 28), found.validUntil());
        assertTrue(found.gclickEnabled());
        assertArrayEquals(new byte[] {2}, found.gclickSecretEnc());
        assertEquals("Acme Ltda", found.name());
        assertEquals("c-notify", found.notifyContactId());
        assertEquals(1, tenants.findAll().size());
    }

    @Test
    void permissionUpsertAndDelete() {
        Tenant t = Samples.active("acme.digisac.co");
        tenants.insert(t);

        permissions.upsert(t.id(), new DeptPermission("d1", false, Set.of("s1", "s2"), false, Set.of("d1")), "u-admin");
        permissions.upsert(t.id(), new DeptPermission("d1", true, Set.of(), false, Set.of("d2")), "u-admin");
        permissions.upsert(t.id(), new DeptPermission("d9", false, Set.of(), true, Set.of()), "u-admin");

        var rules = permissions.findByTenant(t.id());
        assertEquals(2, rules.size());
        DeptPermission d1 = rules.stream().filter(r -> r.departmentId().equals("d1")).findFirst().orElseThrow();
        assertTrue(d1.allServices());
        assertEquals(Set.of("d2"), d1.targetDepartmentIds());

        permissions.delete(t.id(), "d1");
        assertEquals(1, permissions.findByTenant(t.id()).size());
    }

    @Test
    void historyFiltersPaginatesPurgesAndCounts() {
        Tenant t = Samples.active("acme.digisac.co");
        tenants.insert(t);
        history.insert(Samples.ticket(t.id(), "u1", Samples.NOW.minus(Duration.ofDays(400))));
        history.insert(Samples.ticket(t.id(), "u1", Samples.NOW.minus(Duration.ofDays(2))));
        history.insert(Samples.ticket(t.id(), "u1", Samples.NOW.minus(Duration.ofDays(1))));
        history.insert(Samples.ticket(t.id(), "u2", Samples.NOW));

        var mine = history.find(new HistoryRepository.Query(t.id(), "u1", null, null, null, 0, 2));
        assertEquals(3, mine.total());
        assertEquals(2, mine.items().size());
        assertEquals(Samples.NOW.minus(Duration.ofDays(1)), mine.items().get(0).createdAt());

        var recent = history.find(new HistoryRepository.Query(t.id(), null, "d1",
                Samples.NOW.minus(Duration.ofDays(3)), Samples.NOW, 0, 50));
        assertEquals(2, recent.total());

        assertEquals(3L, history.countSince(Samples.NOW.minus(Duration.ofDays(30))).get(t.id()));
        assertEquals(1, history.deleteOlderThan(Samples.NOW.minus(Duration.ofDays(365))));
        assertEquals(3, history.find(new HistoryRepository.Query(t.id(), null, null, null, null, 0, 50)).total());
    }
}
