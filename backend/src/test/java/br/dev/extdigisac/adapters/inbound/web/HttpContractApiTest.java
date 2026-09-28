package br.dev.extdigisac.adapters.inbound.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.extdigisac.testing.ApiTestBase;
import org.junit.jupiter.api.Test;

/** Contratos HTTP que valem para toda a API, independente do endpoint. */
class HttpContractApiTest extends ApiTestBase {

    @Test
    void withoutAuthorizationIsUnauthenticated() throws Exception {
        mvc.perform(get("/catalog").header("X-Ext-Version", VERSION))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void missingVersionOnUnknownPathIsStillUpgradeRequired() throws Exception {
        mvc.perform(get("/nope"))
                .andExpect(status().isUpgradeRequired())
                .andExpect(jsonPath("$.code").value("EXTENSION_OUTDATED"));
    }
}
