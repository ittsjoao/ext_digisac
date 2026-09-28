package br.dev.extdigisac.adapters.inbound.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.testing.ApiTestBase;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class SessionApiTest extends ApiTestBase {

    @BeforeEach
    void identities() {
        digisac.meByToken.put("sess-ana", new DigisacGateway.Me("u1", "Ana", "acc-1", Set.of("d1"), false));
        digisac.meByToken.put("sess-admin", new DigisacGateway.Me("u-admin", "Admin", "acc-1", Set.of(), true));
        digisac.meByToken.put("tok-acc1", new DigisacGateway.Me("u-api", "API", "acc-1", Set.of(), true));
    }

    private String sessionBody(String host, String bearer) {
        return "{\"host\":\"" + host + "\",\"sessionBearer\":\"" + bearer + "\"}";
    }

    @Test
    void exchangesSessionForToken() throws Exception {
        createTenant("acme.digisac.co", TenantStatus.ATIVA);
        mvc.perform(post("/auth/session").header("X-Ext-Version", VERSION).contentType(MediaType.APPLICATION_JSON)
                        .content(sessionBody("acme.digisac.co", "sess-ana")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiresAt").isNotEmpty())
                .andExpect(jsonPath("$.user.id").value("u1"))
                .andExpect(jsonPath("$.user.isAdmin").value(false))
                .andExpect(jsonPath("$.tenant.name").value("Acme"));
    }

    @Test
    void unknownTenantTellsIfCanRegister() throws Exception {
        mvc.perform(post("/auth/session").header("X-Ext-Version", VERSION).contentType(MediaType.APPLICATION_JSON)
                        .content(sessionBody("nova.digisac.co", "sess-admin")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TENANT_NOT_FOUND"))
                .andExpect(jsonPath("$.canRegister").value(true));
    }

    @Test
    void outdatedOrMissingVersionIsRejected() throws Exception {
        mvc.perform(post("/auth/session").header("X-Ext-Version", "5.0.0").contentType(MediaType.APPLICATION_JSON)
                        .content(sessionBody("acme.digisac.co", "sess-ana")))
                .andExpect(status().isUpgradeRequired())
                .andExpect(jsonPath("$.code").value("EXTENSION_OUTDATED"));
        mvc.perform(post("/auth/session").contentType(MediaType.APPLICATION_JSON)
                        .content(sessionBody("acme.digisac.co", "sess-ana")))
                .andExpect(status().isUpgradeRequired());
    }

    @Test
    void registerCreatesPendingThenSessionIsPending() throws Exception {
        mvc.perform(post("/tenants").header("X-Ext-Version", VERSION).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"host\":\"acme.digisac.co\",\"sessionBearer\":\"sess-admin\",\"name\":\"Acme\","
                                + "\"digisacToken\":\"tok-acc1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDENTE"));

        mvc.perform(post("/auth/session").header("X-Ext-Version", VERSION).contentType(MediaType.APPLICATION_JSON)
                        .content(sessionBody("acme.digisac.co", "sess-ana")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("TENANT_PENDING"))
                .andExpect(jsonPath("$.contact").value("suporte@example.com"));
    }

    @Test
    void invalidBodyAndHost() throws Exception {
        mvc.perform(post("/auth/session").header("X-Ext-Version", VERSION).contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(post("/auth/session").header("X-Ext-Version", VERSION).contentType(MediaType.APPLICATION_JSON)
                        .content(sessionBody("evil.com", "sess-ana")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_HOST"));
    }
}
