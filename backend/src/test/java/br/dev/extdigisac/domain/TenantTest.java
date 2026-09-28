package br.dev.extdigisac.domain;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

import br.dev.extdigisac.testing.Samples;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class TenantTest {

    static final LocalDate TODAY = LocalDate.of(2026, 9, 28);

    @Test
    void activeWithoutExpiryIsAllowed() {
        assertDoesNotThrow(() -> Samples.active("acme.digisac.co").requireAccess(TODAY));
    }

    @Test
    void activeOnLastDayIsAllowed() {
        assertDoesNotThrow(() -> Samples.tenant("acme.digisac.co", TenantStatus.ATIVA, TODAY).requireAccess(TODAY));
    }

    @Test
    void activePastExpiryIsExpired() {
        var t = Samples.tenant("acme.digisac.co", TenantStatus.ATIVA, TODAY.minusDays(1));
        assertCode(ErrorCode.LICENSE_EXPIRED, () -> t.requireAccess(TODAY));
    }

    @ParameterizedTest
    @CsvSource({"PENDENTE,TENANT_PENDING", "BLOQUEADA,TENANT_BLOCKED", "CREDENCIAL_INVALIDA,CREDENTIAL_INVALID"})
    void nonActiveStatusesAreDenied(TenantStatus status, ErrorCode expected) {
        var t = Samples.tenant("acme.digisac.co", status, null);
        assertCode(expected, () -> t.requireAccess(TODAY));
    }

    @Test
    void renewBeforeExpiryKeepsRemainingDays() {
        assertEquals(LocalDate.of(2026, 10, 30), Tenant.renewedUntil(LocalDate.of(2026, 9, 30), TODAY, 30));
    }

    @Test
    void renewAfterExpiryStartsToday() {
        assertEquals(LocalDate.of(2026, 10, 28), Tenant.renewedUntil(LocalDate.of(2026, 9, 1), TODAY, 30));
    }

    @Test
    void renewWithoutExpiryStartsToday() {
        assertEquals(TODAY.plusDays(30), Tenant.renewedUntil(null, TODAY, 30));
    }

    @Test
    void withStatusKeepsOtherFields() {
        var t = Samples.active("acme.digisac.co");
        var blocked = t.withStatus(TenantStatus.BLOQUEADA, Samples.NOW.plusSeconds(60));
        assertEquals(TenantStatus.BLOQUEADA, blocked.status());
        assertEquals(t.host(), blocked.host());
        assertEquals(Samples.NOW.plusSeconds(60), blocked.updatedAt());
    }
}
