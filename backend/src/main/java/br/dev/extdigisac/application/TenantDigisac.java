package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.SecretCipher;
import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import java.time.Clock;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;

/** Chamadas ao DigiSac com o token da empresa; 401 marca a empresa como CREDENCIAL_INVALIDA. */
public class TenantDigisac {

    private final DigisacGateway gateway;
    private final SecretCipher cipher;
    private final TenantRepository tenants;
    private final TenantAccess access;
    private final Clock clock;

    public TenantDigisac(DigisacGateway gateway, SecretCipher cipher, TenantRepository tenants,
            TenantAccess access, Clock clock) {
        this.gateway = gateway;
        this.cipher = cipher;
        this.tenants = tenants;
        this.access = access;
        this.clock = clock;
    }

    public <T> T call(Tenant tenant, BiFunction<DigisacGateway, DigisacGateway.Auth, T> fn) {
        var auth = new DigisacGateway.Auth(tenant.host(), cipher.decrypt(tenant.digisacTokenEnc()));
        try {
            return fn.apply(gateway, auth);
        } catch (DigisacGateway.UnauthorizedException e) {
            tenants.findById(tenant.id())
                    .filter(cur -> cur.status() == TenantStatus.ATIVA)
                    .ifPresent(cur -> tenants.update(cur.withStatus(TenantStatus.CREDENCIAL_INVALIDA, clock.instant())));
            access.invalidate(tenant.id());
            throw new AppException(ErrorCode.CREDENTIAL_INVALID,
                    "O token DigiSac da empresa foi recusado; o administrador precisa atualizá-lo.");
        }
    }

    public void run(Tenant tenant, BiConsumer<DigisacGateway, DigisacGateway.Auth> fn) {
        call(tenant, (g, a) -> {
            fn.accept(g, a);
            return null;
        });
    }
}
