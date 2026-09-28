package br.dev.extdigisac.domain;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

public final class PermissionPolicy {

    private PermissionPolicy() {
    }

    public static Allowed resolve(Actor actor, Collection<DeptPermission> rules) {
        if (actor.admin()) {
            return new Allowed(true, Set.of(), true, Set.of());
        }
        boolean any = false;
        boolean allServices = false;
        boolean allTargets = false;
        Set<String> services = new HashSet<>();
        Set<String> targets = new HashSet<>();
        for (DeptPermission rule : rules) {
            if (!actor.deptIds().contains(rule.departmentId())) {
                continue;
            }
            any = true;
            allServices |= rule.allServices();
            allTargets |= rule.allTargets();
            services.addAll(rule.serviceIds());
            targets.addAll(rule.targetDepartmentIds());
        }
        if (!any) {
            throw new AppException(ErrorCode.NO_PERMISSION_RULE,
                    "Seu departamento não tem permissão configurada. Solicite ao administrador.");
        }
        return new Allowed(allServices, allServices ? Set.of() : Set.copyOf(services),
                allTargets, allTargets ? Set.of() : Set.copyOf(targets));
    }
}
