package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Confere status e licença da empresa em toda request; bloqueio vale em até 60 s. */
public class TenantAccess {

    private static final Duration TTL = Duration.ofSeconds(60);

    private record Cached(Tenant tenant, Instant at) {
    }

    private final TenantRepository tenants;
    private final Clock clock;
    private final Map<UUID, Cached> cache = new ConcurrentHashMap<>();

    public TenantAccess(TenantRepository tenants, Clock clock) {
        this.tenants = tenants;
        this.clock = clock;
    }

    public Tenant requireActive(UUID tenantId) {
        Instant now = clock.instant();
        Cached c = cache.get(tenantId);
        if (c == null || now.isAfter(c.at().plus(TTL))) {
            Tenant t = tenants.findById(tenantId)
                    .orElseThrow(() -> new AppException(ErrorCode.TENANT_NOT_FOUND, "Empresa não encontrada."));
            c = new Cached(t, now);
            cache.put(tenantId, c);
        }
        c.tenant().requireAccess(LocalDate.ofInstant(now, Tenant.ZONE));
        return c.tenant();
    }

    public void invalidate(UUID tenantId) {
        cache.remove(tenantId);
    }
}
