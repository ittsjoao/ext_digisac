package br.dev.extdigisac.adapters.outbound.session;

import static java.nio.charset.StandardCharsets.UTF_8;

import br.dev.extdigisac.application.port.out.SessionTokens;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Token opaco para a extensão: base64url(payload) + "." + base64url(HMAC-SHA256).
 * ponytail: formato próprio em vez de JWT porque só este backend lê o token; troque por JWT se outro serviço precisar validá-lo.
 */
public final class HmacSessionTokens implements SessionTokens {

    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private final SecretKeySpec key;
    private final Clock clock;
    private final Duration ttl;

    public HmacSessionTokens(byte[] secret, Clock clock, Duration ttl) {
        if (secret.length < 32) {
            throw new IllegalArgumentException("SESSION_SECRET precisa de pelo menos 32 bytes");
        }
        this.key = new SecretKeySpec(secret, "HmacSHA256");
        this.clock = clock;
        this.ttl = ttl;
    }

    @Override
    public Issued issue(Actor a) {
        Instant exp = clock.instant().plus(ttl);
        String payload = String.join("|", "v1", a.tenantId().toString(), a.userId(), a.admin() ? "1" : "0",
                Long.toString(exp.getEpochSecond()), String.join(",", a.deptIds()),
                ENC.encodeToString(a.userName().getBytes(UTF_8)));
        byte[] p = payload.getBytes(UTF_8);
        return new Issued(ENC.encodeToString(p) + "." + ENC.encodeToString(mac(p)), exp);
    }

    @Override
    public Actor verify(String token) {
        String[] parts = token == null ? new String[0] : token.split("\\.");
        if (parts.length != 2) {
            throw invalid();
        }
        byte[] payload;
        byte[] signature;
        try {
            payload = DEC.decode(parts[0]);
            signature = DEC.decode(parts[1]);
        } catch (IllegalArgumentException e) {
            throw invalid();
        }
        if (!MessageDigest.isEqual(mac(payload), signature)) {
            throw invalid();
        }
        String[] f = new String(payload, UTF_8).split("\\|", -1);
        if (f.length != 7 || !"v1".equals(f[0])) {
            throw invalid();
        }
        if (clock.instant().getEpochSecond() >= Long.parseLong(f[4])) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED, "Sessão expirada.");
        }
        Set<String> depts = f[5].isEmpty() ? Set.of() : Set.of(f[5].split(","));
        return new Actor(UUID.fromString(f[1]), f[2], new String(DEC.decode(f[6]), UTF_8), depts, "1".equals(f[3]));
    }

    private byte[] mac(byte[] data) {
        try {
            Mac m = Mac.getInstance("HmacSHA256");
            m.init(key);
            return m.doFinal(data);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static AppException invalid() {
        return new AppException(ErrorCode.UNAUTHENTICATED, "Sessão inválida.");
    }
}
