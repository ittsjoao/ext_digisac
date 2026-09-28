package br.dev.extdigisac.testing;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.extdigisac.TestcontainersConfiguration;
import br.dev.extdigisac.application.TenantAccess;
import br.dev.extdigisac.application.port.out.PermissionRepository;
import br.dev.extdigisac.application.port.out.SecretCipher;
import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Import({TestcontainersConfiguration.class, FakeGatewaysConfig.class})
@ActiveProfiles("test")
public abstract class ApiTestBase {

    protected static final String VERSION = "5.1.0";
    protected static final String ADMIN_KEY = "test-admin-key-0123456789abcdefghij";

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private JdbcClient jdbc;
    @Autowired
    protected FakeDigisac digisac;
    @Autowired
    protected FakeGClick gclick;
    @Autowired
    protected TenantRepository tenants;
    @Autowired
    protected PermissionRepository permissions;
    @Autowired
    protected SecretCipher cipher;
    @Autowired
    protected TenantAccess access;

    protected MockMvc mvc;

    @BeforeEach
    void resetState() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        jdbc.sql("DELETE FROM tenant").update();
        digisac.reset();
        gclick.reset();
    }

    /** Empresa com conta "acc-1" e token DigiSac "tok". */
    protected Tenant createTenant(String host, TenantStatus status) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        Tenant t = new Tenant(UUID.randomUUID(), host, "acc-1", "Acme", status, null, false, cipher.encrypt("tok"),
                null, null, null, "owner", now, now);
        tenants.insert(t);
        return t;
    }

    protected String login(String host, String sessionBearer) throws Exception {
        String body = mvc.perform(post("/auth/session").header("X-Ext-Version", VERSION)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"host\":\"" + host + "\",\"sessionBearer\":\"" + sessionBearer + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }
}
