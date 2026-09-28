package br.dev.extdigisac.adapters.outbound.persistence;

import br.dev.extdigisac.application.port.out.PermissionRepository;
import br.dev.extdigisac.domain.DeptPermission;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

public final class JdbcPermissionRepository implements PermissionRepository {

    private final JdbcClient jdbc;

    public JdbcPermissionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<DeptPermission> findByTenant(UUID tenantId) {
        return jdbc.sql("SELECT department_id, all_services, service_ids, all_targets, target_department_ids "
                        + "FROM dept_permission WHERE tenant_id = :tenant ORDER BY department_id")
                .param("tenant", tenantId)
                .query(JdbcPermissionRepository::map)
                .list();
    }

    @Override
    public void upsert(UUID tenantId, DeptPermission rule, String updatedBy) {
        jdbc.sql("INSERT INTO dept_permission (tenant_id, department_id, all_services, service_ids, all_targets, "
                        + "target_department_ids, updated_by, updated_at) VALUES (:tenant, :dept, :allServices, "
                        + "CAST(:services AS text[]), :allTargets, CAST(:targets AS text[]), :by, :at) "
                        + "ON CONFLICT (tenant_id, department_id) DO UPDATE SET all_services = EXCLUDED.all_services, "
                        + "service_ids = EXCLUDED.service_ids, all_targets = EXCLUDED.all_targets, "
                        + "target_department_ids = EXCLUDED.target_department_ids, updated_by = EXCLUDED.updated_by, "
                        + "updated_at = EXCLUDED.updated_at")
                .param("tenant", tenantId)
                .param("dept", rule.departmentId())
                .param("allServices", rule.allServices())
                .param("services", rule.serviceIds().toArray(String[]::new))
                .param("allTargets", rule.allTargets())
                .param("targets", rule.targetDepartmentIds().toArray(String[]::new))
                .param("by", updatedBy)
                .param("at", OffsetDateTime.now(ZoneOffset.UTC))
                .update();
    }

    @Override
    public void delete(UUID tenantId, String departmentId) {
        jdbc.sql("DELETE FROM dept_permission WHERE tenant_id = :tenant AND department_id = :dept")
                .param("tenant", tenantId)
                .param("dept", departmentId)
                .update();
    }

    private static DeptPermission map(ResultSet rs, int row) throws SQLException {
        return new DeptPermission(
                rs.getString("department_id"),
                rs.getBoolean("all_services"),
                toSet(rs.getArray("service_ids")),
                rs.getBoolean("all_targets"),
                toSet(rs.getArray("target_department_ids")));
    }

    private static Set<String> toSet(Array array) throws SQLException {
        return Set.copyOf(Arrays.asList((String[]) array.getArray()));
    }
}
