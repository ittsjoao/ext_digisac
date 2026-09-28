package br.dev.extdigisac.adapters.inbound.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.extdigisac.application.port.out.DigisacGateway.Me;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.testing.ApiTestBase;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AdminApiTest extends ApiTestBase {

    @Test
    void adminRoutesNeedTheKey() throws Exception {
        mvc.perform(get("/admin/tenants")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/tenants").header("X-Admin-Key", "errada")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/tenants").header("X-Admin-Key", ADMIN_KEY)).andExpect(status().isOk());
    }

    @Test
    void corsPreflightFromLocalPanelIsAllowed() throws Exception {
        mvc.perform(options("/admin/tenants").header("Origin", "http://localhost:8765")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "X-Admin-Key"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8765"));
    }

    @Test
    void ownerCreatesRenewsAndBlocks() throws Exception {
        digisac.meByToken.put("tok-acc1", new Me("u-api", "API", "acc-1", Set.of(), true));
        digisac.meByToken.put("sess-ana", new Me("u1", "Ana", "acc-1", Set.of("d1"), false));

        String body = mvc.perform(post("/admin/tenants").header("X-Admin-Key", ADMIN_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"host\":\"acme.digisac.co\",\"name\":\"Acme\",\"digisacToken\":\"tok-acc1\","
                                + "\"validUntil\":\"2099-01-01\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ATIVA"))
                .andReturn().getResponse().getContentAsString();
        String id = com.jayway.jsonpath.JsonPath.read(body, "$.id");

        mvc.perform(post("/admin/tenants/" + id + "/renew").header("X-Admin-Key", ADMIN_KEY)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"days\":30}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validUntil").value("2099-01-31"));

        login("acme.digisac.co", "sess-ana");

        mvc.perform(patch("/admin/tenants/" + id).header("X-Admin-Key", ADMIN_KEY)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"BLOQUEADA\"}"))
                .andExpect(status().isOk());

        mvc.perform(post("/auth/session").header("X-Ext-Version", VERSION).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"host\":\"acme.digisac.co\",\"sessionBearer\":\"sess-ana\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("TENANT_BLOCKED"));

        mvc.perform(get("/admin/tenants").header("X-Admin-Key", ADMIN_KEY))
                .andExpect(jsonPath("$[0].status").value("BLOQUEADA"))
                .andExpect(jsonPath("$[0].tickets30d").value(0));
    }

    @Test
    void renewValidatesDays() throws Exception {
        Tenant t = createTenant("acme.digisac.co", TenantStatus.ATIVA);
        mvc.perform(post("/admin/tenants/" + t.id() + "/renew").header("X-Admin-Key", ADMIN_KEY)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"days\":0}"))
                .andExpect(status().isBadRequest());
    }
}
