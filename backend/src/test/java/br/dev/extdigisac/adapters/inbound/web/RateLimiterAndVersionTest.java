package br.dev.extdigisac.adapters.inbound.web;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.testing.MutableClock;
import br.dev.extdigisac.testing.Samples;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class RateLimiterAndVersionTest {

    @Test
    void limitsPerKeyPerMinute() {
        var clock = new MutableClock(Samples.NOW);
        var limiter = new RateLimiter(2, clock);
        assertTrue(limiter.tryAcquire("1.1.1.1"));
        assertTrue(limiter.tryAcquire("1.1.1.1"));
        assertFalse(limiter.tryAcquire("1.1.1.1"));
        assertTrue(limiter.tryAcquire("2.2.2.2"));
        clock.advance(Duration.ofMinutes(1));
        assertTrue(limiter.tryAcquire("1.1.1.1"));
    }

    @Test
    void versionComparison() {
        assertTrue(VersionInterceptor.atLeast("5.1.0", "5.1.0"));
        assertTrue(VersionInterceptor.atLeast("5.10.0", "5.9.9"));
        assertTrue(VersionInterceptor.atLeast("6", "5.1.0"));
        assertFalse(VersionInterceptor.atLeast("5.0.9", "5.1.0"));
        assertFalse(VersionInterceptor.atLeast(null, "5.1.0"));
        assertFalse(VersionInterceptor.atLeast("abc", "5.1.0"));
    }
}
