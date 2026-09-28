package br.dev.extdigisac.domain;

import java.util.Set;

/** Regra de um departamento: quais serviços usa e para quais departamentos pode abrir chamado. */
public record DeptPermission(
        String departmentId,
        boolean allServices,
        Set<String> serviceIds,
        boolean allTargets,
        Set<String> targetDepartmentIds) {
}
