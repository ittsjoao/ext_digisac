package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.Texts;
import java.time.Clock;
import java.time.Instant;

public class HistoryService {

    public record Filter(String userId, String departmentId, Instant from, Instant to, int page, int size) {
    }

    private final TenantAccess access;
    private final HistoryRepository history;
    private final Clock clock;

    public HistoryService(TenantAccess access, HistoryRepository history, Clock clock) {
        this.access = access;
        this.history = history;
        this.clock = clock;
    }

    /** Atendente vê só os próprios chamados, qualquer que seja o filtro enviado. */
    public HistoryRepository.Page list(Actor a, Filter f) {
        access.requireActive(a.tenantId());
        String userId = a.admin() ? Texts.blankToNull(f.userId()) : a.userId();
        return history.find(new HistoryRepository.Query(a.tenantId(), userId, Texts.blankToNull(f.departmentId()),
                f.from(), f.to(), Math.max(0, f.page()), Math.clamp(f.size(), 1, 100)));
    }

    /** LGPD: histórico vive 12 meses. */
    public int purge() {
        Instant cutoff = clock.instant().atZone(Tenant.ZONE).minusMonths(12).toInstant();
        return history.deleteOlderThan(cutoff);
    }
}
