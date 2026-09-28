package br.dev.extdigisac.testing;

import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.domain.TicketRecord;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public final class FakeHistoryRepository implements HistoryRepository {

    public final List<TicketRecord> rows = new ArrayList<>();
    public Query lastQuery;

    @Override
    public void insert(TicketRecord record) {
        rows.add(record);
    }

    @Override
    public Page find(Query q) {
        lastQuery = q;
        List<TicketRecord> all = rows.stream()
                .filter(r -> r.tenantId().equals(q.tenantId()))
                .filter(r -> q.userId() == null || r.userId().equals(q.userId()))
                .filter(r -> q.departmentId() == null || r.departmentId().equals(q.departmentId()))
                .filter(r -> q.from() == null || !r.createdAt().isBefore(q.from()))
                .filter(r -> q.to() == null || r.createdAt().isBefore(q.to()))
                .sorted(Comparator.comparing(TicketRecord::createdAt).reversed())
                .toList();
        int from = Math.min(q.page() * q.size(), all.size());
        int to = Math.min(from + q.size(), all.size());
        return new Page(all.subList(from, to), all.size());
    }

    @Override
    public int deleteOlderThan(Instant cutoff) {
        int before = rows.size();
        rows.removeIf(r -> r.createdAt().isBefore(cutoff));
        return before - rows.size();
    }

    @Override
    public Map<UUID, Long> countSince(Instant since) {
        return rows.stream().filter(r -> !r.createdAt().isBefore(since))
                .collect(Collectors.groupingBy(TicketRecord::tenantId, Collectors.counting()));
    }
}
