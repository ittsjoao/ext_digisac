package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.PermissionService;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.DeptPermission;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PermissionController {

    // ponytail: Boolean (não boolean) porque o Jackson 3 do Spring Boot 4 falha ao desserializar
    // um record com primitivo ausente do JSON (FAIL_ON_NULL_FOR_PRIMITIVES=true por padrão); ver Deviations no report.
    record PermissionRequest(Boolean allServices, List<String> serviceIds, Boolean allTargets,
            List<String> targetDepartmentIds) {
    }

    private final PermissionService permissions;

    public PermissionController(PermissionService permissions) {
        this.permissions = permissions;
    }

    @GetMapping("/permissions")
    PermissionService.PermissionsView get(Actor actor) {
        return permissions.get(actor);
    }

    @PutMapping("/permissions/{departmentId}")
    DeptPermission put(Actor actor, @PathVariable String departmentId, @RequestBody PermissionRequest r) {
        return permissions.put(actor, new DeptPermission(departmentId,
                Boolean.TRUE.equals(r.allServices()), r.serviceIds() == null ? Set.of() : Set.copyOf(r.serviceIds()),
                Boolean.TRUE.equals(r.allTargets()),
                r.targetDepartmentIds() == null ? Set.of() : Set.copyOf(r.targetDepartmentIds())));
    }

    @DeleteMapping("/permissions/{departmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Actor actor, @PathVariable String departmentId) {
        permissions.delete(actor, departmentId);
    }
}
