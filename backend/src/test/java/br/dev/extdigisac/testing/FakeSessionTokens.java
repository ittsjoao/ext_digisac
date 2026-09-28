package br.dev.extdigisac.testing;

import br.dev.extdigisac.application.port.out.SessionTokens;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public final class FakeSessionTokens implements SessionTokens {

    private final Map<String, Actor> issued = new HashMap<>();

    @Override
    public Issued issue(Actor actor) {
        String token = "tok:" + actor.userId();
        issued.put(token, actor);
        return new Issued(token, Instant.EPOCH);
    }

    @Override
    public Actor verify(String token) {
        Actor a = issued.get(token);
        if (a == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Sessão inválida.");
        }
        return a;
    }
}
