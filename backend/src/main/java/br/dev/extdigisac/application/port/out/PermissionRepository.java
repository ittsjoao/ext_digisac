package br.dev.extdigisac.application.port.out;

import br.dev.extdigisac.domain.DeptPermission;
import java.util.List;
import java.util.UUID;

public interface PermissionRepository {

    List<DeptPermission> findByTenant(UUID tenantId);

    void upsert(UUID tenantId, DeptPermission rule, String updatedBy);

    void delete(UUID tenantId, String departmentId);
}
