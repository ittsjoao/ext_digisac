package br.dev.extdigisac.testing;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Substitui DigiSac e G-Click reais pelos fakes nos testes de API. */
@TestConfiguration(proxyBeanMethods = false)
public class FakeGatewaysConfig {

    @Bean
    @Primary
    FakeDigisac fakeDigisac() {
        return new FakeDigisac();
    }

    @Bean
    @Primary
    FakeGClick fakeGClick() {
        return new FakeGClick();
    }
}
