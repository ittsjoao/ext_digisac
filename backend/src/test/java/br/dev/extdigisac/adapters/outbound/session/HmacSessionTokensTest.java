package br.dev.extdigisac.adapters.outbound.session;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.testing.MutableClock;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class HmacSessionTokensTest {

    static final byte[] SECRET = "test-session-secret-0123456789abcdef".getBytes(StandardCharsets.UTF_8);
    final MutableClock clock = new MutableClock(Instant.parse("2026-09-28T12:00:00Z"));
    final HmacSessionTokens tokens = new HmacSessionTokens(SECRET, clock, Duration.ofHours(1));
    final Actor actor = new Actor(UUID.randomUUID(), "u1", "João | Ç", Set.of("d1", "d2"), true);

    @Test
    void roundTrip() {
        var issued = tokens.issue(actor);
        assertEquals(Instant.parse("2026-09-28T13:00:00Z"), issued.expiresAt());
        assertEquals(actor, tokens.verify(issued.token()));
    }

    @Test
    void emptyDepartmentsRoundTrip() {
        var a = new Actor(UUID.randomUUID(), "u2", "Ana", Set.of(), false);
        assertEquals(a, tokens.verify(tokens.issue(a).token()));
    }

    @Test
    void expiredTokenIsRejected() {
        String token = tokens.issue(actor).token();
        clock.advance(Duration.ofMinutes(61));
        assertCode(ErrorCode.TOKEN_EXPIRED, () -> tokens.verify(token));
    }

    @Test
    void tamperedPayloadIsRejected() {
        String token = tokens.issue(actor).token();
        String forged = tokens.issue(new Actor(actor.tenantId(), "u1", "x", Set.of(), false)).token();
        String mixed = forged.split("\\.")[0] + "." + token.split("\\.")[1];
        assertCode(ErrorCode.UNAUTHENTICATED, () -> tokens.verify(mixed));
    }

    @Test
    void tokenFromOtherSecretIsRejected() {
        var other = new HmacSessionTokens("another-secret-0123456789abcdefghij".getBytes(StandardCharsets.UTF_8),
                clock, Duration.ofHours(1));
        String token = other.issue(actor).token();
        assertCode(ErrorCode.UNAUTHENTICATED, () -> tokens.verify(token));
    }

    @Test
    void garbageIsRejected() {
        assertCode(ErrorCode.UNAUTHENTICATED, () -> tokens.verify("abc"));
        assertCode(ErrorCode.UNAUTHENTICATED, () -> tokens.verify("a.b"));
        assertCode(ErrorCode.UNAUTHENTICATED, () -> tokens.verify(null));
    }

    @Test
    void shortSecretIsRefused() {
        assertThrows(IllegalArgumentException.class,
                () -> new HmacSessionTokens(new byte[16], clock, Duration.ofHours(1)));
    }
}
