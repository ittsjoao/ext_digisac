package br.dev.extdigisac.domain;

import java.util.Set;
import java.util.UUID;

/** Atendente autenticado: vem do /me do DigiSac e viaja no token de sessão. */
public record Actor(UUID tenantId, String userId, String userName, Set<String> deptIds, boolean admin) {
}
