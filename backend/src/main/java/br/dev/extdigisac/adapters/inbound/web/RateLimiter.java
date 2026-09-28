package br.dev.extdigisac.adapters.inbound.web;

import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Janela fixa de 1 minuto por chave (IP). ponytail: em memória, vale para uma instância só. */
public class RateLimiter {

    private record Window(long minute, int count) {
    }

    private final int perMinute;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter(int perMinute, Clock clock) {
        this.perMinute = perMinute;
        this.clock = clock;
    }

    public boolean tryAcquire(String key) {
        long minute = clock.millis() / 60_000;
        if (windows.size() > 10_000) {
            windows.values().removeIf(w -> w.minute() < minute);
        }
        Window w = windows.compute(key, (k, cur) ->
                cur == null || cur.minute() != minute ? new Window(minute, 1) : new Window(minute, cur.count() + 1));
        return w.count() <= perMinute;
    }
}
