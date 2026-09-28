package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.DigisacGateway.Named;
import br.dev.extdigisac.application.port.out.PermissionRepository;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.DeptPermission;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.Texts;
import java.util.List;
import java.util.Set;

public class PermissionService {

    public record PermissionsView(List<DeptPermission> rules, List<Named> services, List<Named> departments) {
    }

    private final TenantAccess access;
    private final TenantDigisac digisac;
    private final PermissionRepository permissions;

    public PermissionService(TenantAccess access, TenantDigisac digisac, PermissionRepository permissions) {
        this.access = access;
        this.digisac = digisac;
        this.permissions = permissions;
    }

    public PermissionsView get(Actor a) {
        requireAdmin(a);
        Tenant t = access.requireActive(a.tenantId());
        return new PermissionsView(permissions.findByTenant(t.id()), digisac.call(t, DigisacGateway::services),
                digisac.call(t, DigisacGateway::departments));
    }

    public DeptPermission put(Actor a, DeptPermission rule) {
        requireAdmin(a);
        access.requireActive(a.tenantId());
        String dept = Texts.requireText(rule.departmentId(), "Informe o departamento.");
        DeptPermission clean = new DeptPermission(dept,
                rule.allServices(), rule.allServices() ? Set.of() : Set.copyOf(rule.serviceIds()),
                rule.allTargets(), rule.allTargets() ? Set.of() : Set.copyOf(rule.targetDepartmentIds()));
        permissions.upsert(a.tenantId(), clean, a.userId());
        return clean;
    }

    public void delete(Actor a, String departmentId) {
        requireAdmin(a);
        access.requireActive(a.tenantId());
        permissions.delete(a.tenantId(), departmentId);
    }

    private static void requireAdmin(Actor a) {
        if (!a.admin()) {
            throw new AppException(ErrorCode.FORBIDDEN, "Apenas administradores do DigiSac podem alterar permissões.");
        }
    }
}
