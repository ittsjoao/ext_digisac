package br.dev.extdigisac.domain;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class HostPolicyTest {

    @Test
    void acceptsDigisacSubdomainAndLowercases() {
        assertEquals("auster.digisac.co", HostPolicy.requireValid(" AUSTER.digisac.co "));
        assertEquals("minha-empresa2.digisac.co", HostPolicy.requireValid("minha-empresa2.digisac.co"));
    }

    // Trava de SSRF: um host fora de *.digisac.co poderia devolver um /me forjado.
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"evil.com", "auster.digisac.co.evil.com", "a.b.digisac.co", "digisac.co",
            "auster.digisac.co:443", "auster.digisac.co/x", "https://auster.digisac.co", "auster.digisac.com"})
    void rejectsAnythingElse(String host) {
        assertCode(ErrorCode.INVALID_HOST, () -> HostPolicy.requireValid(host));
    }
}
