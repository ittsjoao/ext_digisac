package br.dev.extdigisac.domain;

import java.time.Instant;
import java.util.UUID;

/** Linha do histórico; nomes gravados como estavam no momento do chamado, sem o texto do comentário. */
public record TicketRecord(
        UUID id,
        UUID tenantId,
        String userId,
        String userName,
        String contactId,
        String contactName,
        String serviceId,
        String departmentId,
        String assignedUserId,
        String gclickClientName,
        boolean hadComment,
        Instant createdAt) {
}
