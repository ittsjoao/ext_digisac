package br.dev.extdigisac.application.port.out;

import br.dev.extdigisac.domain.TicketRecord;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface HistoryRepository {

    /** Filtros nulos são ignorados; {@code to} é exclusivo. */
    record Query(UUID tenantId, String userId, String departmentId, Instant from, Instant to, int page, int size) {
    }

    record Page(List<TicketRecord> items, long total) {
    }

    void insert(TicketRecord record);

    Page find(Query query);

    int deleteOlderThan(Instant cutoff);

    Map<UUID, Long> countSince(Instant since);
}
