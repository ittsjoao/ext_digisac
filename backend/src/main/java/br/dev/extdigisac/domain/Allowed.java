package br.dev.extdigisac.domain;

import java.util.Set;

public record Allowed(boolean allServices, Set<String> serviceIds, boolean allTargets, Set<String> targetIds) {

    public boolean service(String id) {
        return allServices || serviceIds.contains(id);
    }

    public boolean target(String id) {
        return allTargets || targetIds.contains(id);
    }

    public void requireService(String id) {
        if (!service(id)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Serviço não permitido para o seu departamento.");
        }
    }

    public void requireTarget(String id) {
        if (!target(id)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Departamento de destino não permitido.");
        }
    }
}
