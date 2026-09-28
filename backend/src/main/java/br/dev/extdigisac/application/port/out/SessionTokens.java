package br.dev.extdigisac.application.port.out;

import br.dev.extdigisac.domain.Actor;
import java.time.Instant;

public interface SessionTokens {

    record Issued(String token, Instant expiresAt) {
    }

    Issued issue(Actor actor);

    Actor verify(String token);
}
