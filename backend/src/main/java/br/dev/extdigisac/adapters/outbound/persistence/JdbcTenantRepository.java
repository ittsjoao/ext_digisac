package br.dev.extdigisac.adapters.outbound.persistence;

import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

public final class JdbcTenantRepository implements TenantRepository {

    private static final String SELECT = "SELECT id, host, digisac_account_id, name, status, valid_until, "
            + "gclick_enabled, digisac_token_enc, gclick_client_id_enc, gclick_secret_enc, notify_contact_id, "
            + "registered_by, created_at, updated_at FROM tenant";

    private final JdbcClient jdbc;

    public JdbcTenantRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Tenant> findByHost(String host) {
        return jdbc.sql(SELECT + " WHERE host = :host").param("host", host).query(JdbcTenantRepository::map).optional();
    }

    @Override
    public Optional<Tenant> findById(UUID id) {
        return jdbc.sql(SELECT + " WHERE id = :id").param("id", id).query(JdbcTenantRepository::map).optional();
    }

    @Override
    public List<Tenant> findAll() {
        return jdbc.sql(SELECT + " ORDER BY name").query(JdbcTenantRepository::map).list();
    }

    @Override
    public void insert(Tenant t) {
        bind(jdbc.sql("INSERT INTO tenant (id, host, digisac_account_id, name, status, valid_until, gclick_enabled, "
                + "digisac_token_enc, gclick_client_id_enc, gclick_secret_enc, notify_contact_id, registered_by, "
                + "created_at, updated_at) VALUES (:id, :host, :account, :name, :status, :validUntil, :gclick, "
                + ":tokenEnc, :gcIdEnc, :gcSecretEnc, :notify, :registeredBy, :createdAt, :updatedAt)"), t).update();
    }

    @Override
    public void update(Tenant t) {
        bind(jdbc.sql("UPDATE tenant SET host = :host, digisac_account_id = :account, name = :name, status = :status, "
                + "valid_until = :validUntil, gclick_enabled = :gclick, digisac_token_enc = :tokenEnc, "
                + "gclick_client_id_enc = :gcIdEnc, gclick_secret_enc = :gcSecretEnc, notify_contact_id = :notify, "
                + "registered_by = :registeredBy, created_at = :createdAt, updated_at = :updatedAt WHERE id = :id"), t)
                .update();
    }

    private static JdbcClient.StatementSpec bind(JdbcClient.StatementSpec spec, Tenant t) {
        return spec.param("id", t.id())
                .param("host", t.host())
                .param("account", t.digisacAccountId())
                .param("name", t.name())
                .param("status", t.status().name())
                .param("validUntil", t.validUntil())
                .param("gclick", t.gclickEnabled())
                .param("tokenEnc", t.digisacTokenEnc())
                .param("gcIdEnc", t.gclickClientIdEnc())
                .param("gcSecretEnc", t.gclickSecretEnc())
                .param("notify", t.notifyContactId())
                .param("registeredBy", t.registeredBy())
                .param("createdAt", ts(t.createdAt()))
                .param("updatedAt", ts(t.updatedAt()));
    }

    private static OffsetDateTime ts(Instant i) {
        return OffsetDateTime.ofInstant(i, ZoneOffset.UTC);
    }

    private static Tenant map(ResultSet rs, int row) throws SQLException {
        return new Tenant(
                rs.getObject("id", UUID.class),
                rs.getString("host"),
                rs.getString("digisac_account_id"),
                rs.getString("name"),
                TenantStatus.valueOf(rs.getString("status")),
                rs.getObject("valid_until", LocalDate.class),
                rs.getBoolean("gclick_enabled"),
                rs.getBytes("digisac_token_enc"),
                rs.getBytes("gclick_client_id_enc"),
                rs.getBytes("gclick_secret_enc"),
                rs.getString("notify_contact_id"),
                rs.getString("registered_by"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant());
    }
}
