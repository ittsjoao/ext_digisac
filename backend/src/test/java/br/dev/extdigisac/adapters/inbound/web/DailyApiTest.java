package br.dev.extdigisac.adapters.inbound.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.extdigisac.application.port.out.DigisacGateway.Contact;
import br.dev.extdigisac.application.port.out.DigisacGateway.Me;
import br.dev.extdigisac.application.port.out.DigisacGateway.Named;
import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.domain.DeptPermission;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import br.dev.extdigisac.testing.ApiTestBase;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class DailyApiTest extends ApiTestBase {

    Tenant tenant;
    String ana;
    String admin;

    @BeforeEach
    void setUp() throws Exception {
        tenant = createTenant("acme.digisac.co", TenantStatus.ATIVA);
        digisac.meByToken.put("sess-ana", new Me("u1", "Ana", "acc-1", Set.of("d1"), false));
        digisac.meByToken.put("sess-admin", new Me("u-admin", "Admin", "acc-1", Set.of(), true));
        digisac.services = List.of(new Named("s1", "WhatsApp Fiscal"), new Named("s2", "WhatsApp Comercial"));
        digisac.departments = List.of(new Named("d1", "Fiscal"), new Named("d2", "Comercial"));
        digisac.contacts.put("c1", new Contact("c1", "Joao", "Padaria", "s1", "5534999998888", List.of("VALIDO")));
        permissions.upsert(tenant.id(), new DeptPermission("d1", false, Set.of("s1"), false, Set.of("d1")), "test");
        ana = login("acme.digisac.co", "sess-ana");
        admin = login("acme.digisac.co", "sess-admin");
    }

    private MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder req, String token) {
        return req.header("Authorization", "Bearer " + token).header("X-Ext-Version", VERSION);
    }

    @Test
    void requestsWithoutSessionAreUnauthenticated() throws Exception {
        mvc.perform(get("/catalog").header("X-Ext-Version", VERSION))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void catalogIsFiltered() throws Exception {
        mvc.perform(as(get("/catalog"), ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.services.length()").value(1))
                .andExpect(jsonPath("$.services[0].id").value("s1"))
                .andExpect(jsonPath("$.departments[0].id").value("d1"));
    }

    @Test
    void forbiddenServiceIs403() throws Exception {
        mvc.perform(as(get("/contacts").param("serviceId", "s2"), ana))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void openTicketThenSeeItInHistory() throws Exception {
        mvc.perform(as(post("/tickets"), ana).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serviceId\":\"s1\",\"contactId\":\"c1\",\"departmentId\":\"d1\",\"comment\":\"oi\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contactName").value("Padaria"));

        mvc.perform(as(get("/history"), ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].userId").value("u1"));
    }

    @Test
    void openTicketAndPhoneLookupAnswer204WhenEmpty() throws Exception {
        mvc.perform(as(get("/contacts/c1/open-ticket"), ana)).andExpect(status().isNoContent());
        mvc.perform(as(get("/contacts/by-phone").param("serviceId", "s1").param("phone", "34988887777"), ana))
                .andExpect(status().isNoContent());
        mvc.perform(as(get("/contacts/by-phone").param("serviceId", "s1").param("phone", "(34) 99999-8888"), ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("c1"));
    }

    @Test
    void adminEditsPermissionsAndAttendantSeesIt() throws Exception {
        mvc.perform(as(put("/permissions/d1"), ana).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());

        mvc.perform(as(put("/permissions/d1"), admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"allServices\":false,\"serviceIds\":[\"s1\",\"s2\"],\"allTargets\":true}"))
                .andExpect(status().isOk());
        mvc.perform(as(get("/catalog"), ana))
                .andExpect(jsonPath("$.services.length()").value(2))
                .andExpect(jsonPath("$.departments.length()").value(2));

        mvc.perform(as(delete("/permissions/d1"), admin)).andExpect(status().isNoContent());
        mvc.perform(as(get("/catalog"), ana))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NO_PERMISSION_RULE"));
    }

    @Test
    void nullPermissionElementIsRejected() throws Exception {
        mvc.perform(as(put("/permissions/d1"), admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serviceIds\":[null]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void gclickNeedsTheIntegrationEnabled() throws Exception {
        mvc.perform(as(get("/gclick/clients").param("q", "padaria"), ana))
                .andExpect(status().isForbidden());

        tenants.update(tenant.withCredentials(tenant.digisacTokenEnc(), cipher.encrypt("gc-id"),
                cipher.encrypt("gc-secret"), true, Instant.now()));
        access.invalidate(tenant.id()); // o TenantAccess guarda a empresa por 60 s; na vida real quem muda é o AdminTenantService, que já invalida
        gclick.all = List.of(new GClickGateway.Client(900, "Padaria São João", "", "ATIVO", "12.345.678/0001-99",
                List.of(new GClickGateway.Phone("Cel", "(34) 99999-8888"))));

        mvc.perform(as(get("/gclick/clients").param("q", "sao joao"), ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(900));
        mvc.perform(as(get("/gclick/match").param("contactId", "c1"), ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].apelido").value("Padaria São João"));
        mvc.perform(as(get("/gclick/index-status"), ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.running").value(false));
    }
}
