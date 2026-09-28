package br.dev.extdigisac.testing;

import br.dev.extdigisac.application.port.out.PermissionRepository;
import br.dev.extdigisac.domain.DeptPermission;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class FakePermissionRepository implements PermissionRepository {

    public final Map<UUID, Map<String, DeptPermission>> rows = new HashMap<>();

    @Override
    public List<DeptPermission> findByTenant(UUID tenantId) {
        return new ArrayList<>(rows.getOrDefault(tenantId, Map.of()).values());
    }

    @Override
    public void upsert(UUID tenantId, DeptPermission rule, String updatedBy) {
        rows.computeIfAbsent(tenantId, k -> new LinkedHashMap<>()).put(rule.departmentId(), rule);
    }

    @Override
    public void delete(UUID tenantId, String departmentId) {
        rows.getOrDefault(tenantId, new HashMap<>()).remove(departmentId);
    }
}
