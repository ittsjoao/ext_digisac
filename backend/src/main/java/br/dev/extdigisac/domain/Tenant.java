package br.dev.extdigisac.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

public record Tenant(
        UUID id,
        String host,
        String digisacAccountId,
        String name,
        TenantStatus status,
        LocalDate validUntil,
        boolean gclickEnabled,
        byte[] digisacTokenEnc,
        byte[] gclickClientIdEnc,
        byte[] gclickSecretEnc,
        String notifyContactId,
        String registeredBy,
        Instant createdAt,
        Instant updatedAt) {

    /** Fuso de "hoje" para vencimento e datas exibidas. */
    public static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    public void requireAccess(LocalDate today) {
        switch (status) {
            case PENDENTE -> throw new AppException(ErrorCode.TENANT_PENDING, "Cadastro da empresa em análise.");
            case BLOQUEADA -> throw new AppException(ErrorCode.TENANT_BLOCKED, "Empresa bloqueada.");
            case CREDENCIAL_INVALIDA -> throw new AppException(ErrorCode.CREDENTIAL_INVALID,
                    "O token DigiSac da empresa foi recusado; o administrador precisa atualizá-lo.");
            case ATIVA -> {
                if (validUntil != null && today.isAfter(validUntil)) {
                    throw new AppException(ErrorCode.LICENSE_EXPIRED, "Licença vencida.");
                }
            }
        }
    }

    public boolean hasGClickCredentials() {
        return gclickClientIdEnc != null && gclickSecretEnc != null;
    }

    /** Soma a partir da data maior entre hoje e o vencimento atual. */
    public static LocalDate renewedUntil(LocalDate current, LocalDate today, int days) {
        LocalDate base = current == null || current.isBefore(today) ? today : current;
        return base.plusDays(days);
    }

    public Tenant withStatus(TenantStatus newStatus, Instant now) {
        return new Tenant(id, host, digisacAccountId, name, newStatus, validUntil, gclickEnabled,
                digisacTokenEnc, gclickClientIdEnc, gclickSecretEnc, notifyContactId, registeredBy, createdAt, now);
    }

    public Tenant withValidUntil(LocalDate newValidUntil, Instant now) {
        return new Tenant(id, host, digisacAccountId, name, status, newValidUntil, gclickEnabled,
                digisacTokenEnc, gclickClientIdEnc, gclickSecretEnc, notifyContactId, registeredBy, createdAt, now);
    }

    public Tenant withCredentials(byte[] digisac, byte[] gclickId, byte[] gclickSecret, boolean gclick, Instant now) {
        return new Tenant(id, host, digisacAccountId, name, status, validUntil, gclick,
                digisac, gclickId, gclickSecret, notifyContactId, registeredBy, createdAt, now);
    }

    public Tenant withDetails(String newName, boolean gclick, String newNotifyContactId, Instant now) {
        return new Tenant(id, host, digisacAccountId, newName, status, validUntil, gclick,
                digisacTokenEnc, gclickClientIdEnc, gclickSecretEnc, newNotifyContactId, registeredBy, createdAt, now);
    }
}
