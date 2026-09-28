package br.dev.extdigisac.adapters.outbound.gclick;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

import br.dev.extdigisac.application.port.out.GClickGateway;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class GClickRestGatewayTest {

    static final String BASE = "https://api.gclick.com.br";
    static final GClickGateway.Credentials CREDS = new GClickGateway.Credentials("id-1", "secret-1");
    static final String PAGE = """
            {"content":[{"id":7,"nome":null,"apelido":"Padaria","status":"ATIVO","inscricao":"12.345.678/0001-99",
                         "telefones":[{"nome":"Fixo","numero":"(34) 3236-9899"}]}],
             "totalElements":1,"totalPages":1}
            """;

    MockRestServiceServer server;
    GClickRestGateway gateway;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        gateway = new GClickRestGateway(builder.build(), Clock.fixed(Instant.parse("2026-09-28T12:00:00Z"), ZoneOffset.UTC));
    }

    private void expectToken(String value) {
        server.expect(requestTo(BASE + "/oauth/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("grant_type=client_credentials")))
                .andExpect(content().string(containsString("client_id=id-1")))
                .andRespond(withSuccess("{\"access_token\":\"" + value + "\",\"expires_in\":3600}", MediaType.APPLICATION_JSON));
    }

    @Test
    void tokenIsCachedAcrossCalls() {
        expectToken("t1");
        server.expect(requestTo(BASE + "/clientes?page=0&size=100")).andExpect(header("Authorization", "Bearer t1"))
                .andRespond(withSuccess(PAGE, MediaType.APPLICATION_JSON));
        server.expect(requestTo(BASE + "/clientes?page=1&size=100")).andExpect(header("Authorization", "Bearer t1"))
                .andRespond(withSuccess(PAGE, MediaType.APPLICATION_JSON));

        gateway.clients(CREDS, 0, 100);
        gateway.clients(CREDS, 1, 100);
        server.verify();
    }

    @Test
    void clientNameFallsBackToApelido() {
        expectToken("t1");
        server.expect(requestTo(BASE + "/clientes?page=0&size=100")).andRespond(withSuccess(PAGE, MediaType.APPLICATION_JSON));

        GClickGateway.Page page = gateway.clients(CREDS, 0, 100);

        assertEquals("Padaria", page.content().get(0).nome());
        assertEquals("(34) 3236-9899", page.content().get(0).telefones().get(0).numero());
        assertEquals(1, page.totalPages());
    }

    @Test
    void expiredTokenOnDataCallIsRenewedOnce() {
        expectToken("t1");
        server.expect(requestTo(BASE + "/clientes/7/responsaveis")).andRespond(withUnauthorizedRequest());
        expectToken("t2");
        server.expect(requestTo(BASE + "/clientes/7/responsaveis")).andExpect(header("Authorization", "Bearer t2"))
                .andRespond(withSuccess("[{\"id\":1,\"nome\":\"Bia\",\"email\":\"b@x\",\"cargo\":{\"nome\":\"Fiscal - Líder\"}}]",
                        MediaType.APPLICATION_JSON));

        var list = gateway.responsaveis(CREDS, 7);

        assertEquals("Fiscal - Líder", list.get(0).cargo().nome());
        server.verify();
    }

    @Test
    void rejectedCredentialsFailVerify() {
        server.expect(requestTo(BASE + "/oauth/token")).andRespond(withBadRequest());
        assertThrows(GClickGateway.UnauthorizedException.class, () -> gateway.verify(CREDS));
    }
}
