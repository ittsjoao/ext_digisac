package br.dev.extdigisac.adapters.outbound.persistence;

import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.domain.TicketRecord;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;

public final class JdbcHistoryRepository implements HistoryRepository {

    private static final String SELECT = "SELECT id, tenant_id, user_id, user_name, contact_id, contact_name, "
            + "service_id, department_id, assigned_user_id, gclick_client_name, had_comment, created_at "
            + "FROM ticket_history";

    private final JdbcClient jdbc;

    public JdbcHistoryRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void insert(TicketRecord r) {
        jdbc.sql("INSERT INTO ticket_history (id, tenant_id, user_id, user_name, contact_id, contact_name, service_id, "
                        + "department_id, assigned_user_id, gclick_client_name, had_comment, created_at) VALUES (:id, "
                        + ":tenant, :user, :userName, :contact, :contactName, :service, :dept, :assigned, :gclick, "
                        + ":hadComment, :at)")
                .param("id", r.id())
                .param("tenant", r.tenantId())
                .param("user", r.userId())
                .param("userName", r.userName())
                .param("contact", r.contactId())
                .param("contactName", r.contactName())
                .param("service", r.serviceId())
                .param("dept", r.departmentId())
                .param("assigned", r.assignedUserId())
                .param("gclick", r.gclickClientName())
                .param("hadComment", r.hadComment())
                .param("at", ts(r.createdAt()))
                .update();
    }

    @Override
    public Page find(Query q) {
        StringBuilder where = new StringBuilder(" WHERE tenant_id = :tenant");
        Map<String, Object> params = new HashMap<>();
        params.put("tenant", q.tenantId());
        if (q.userId() != null) {
            where.append(" AND user_id = :user");
            params.put("user", q.userId());
        }
        if (q.departmentId() != null) {
            where.append(" AND department_id = :dept");
            params.put("dept", q.departmentId());
        }
        if (q.from() != null) {
            where.append(" AND created_at >= :from");
            params.put("from", ts(q.from()));
        }
        if (q.to() != null) {
            where.append(" AND created_at < :to");
            params.put("to", ts(q.to()));
        }
        long total = jdbc.sql("SELECT count(*) FROM ticket_history" + where).params(params).query(Long.class).single();
        params.put("limit", q.size());
        params.put("offset", (long) q.page() * q.size());
        List<TicketRecord> items = jdbc.sql(SELECT + where + " ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
                .params(params)
                .query(JdbcHistoryRepository::map)
                .list();
        return new Page(items, total);
    }

    @Override
    public int deleteOlderThan(Instant cutoff) {
        return jdbc.sql("DELETE FROM ticket_history WHERE created_at < :cutoff").param("cutoff", ts(cutoff)).update();
    }

    @Override
    public Map<UUID, Long> countSince(Instant since) {
        return jdbc.sql("SELECT tenant_id, count(*) AS n FROM ticket_history WHERE created_at >= :since GROUP BY tenant_id")
                .param("since", ts(since))
                .query((rs, row) -> Map.entry(rs.getObject("tenant_id", UUID.class), rs.getLong("n")))
                .list()
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private static OffsetDateTime ts(Instant i) {
        return OffsetDateTime.ofInstant(i, ZoneOffset.UTC);
    }

    private static TicketRecord map(ResultSet rs, int row) throws SQLException {
        return new TicketRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("tenant_id", UUID.class),
                rs.getString("user_id"),
                rs.getString("user_name"),
                rs.getString("contact_id"),
                rs.getString("contact_name"),
                rs.getString("service_id"),
                rs.getString("department_id"),
                rs.getString("assigned_user_id"),
                rs.getString("gclick_client_name"),
                rs.getBoolean("had_comment"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }
}
