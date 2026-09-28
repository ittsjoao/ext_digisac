package br.dev.extdigisac.adapters.outbound.digisac;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.domain.ErrorCode;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class DigisacRestGatewayTest {

    static final String API = "https://acme.digisac.co/api/v1/";
    static final DigisacGateway.Auth AUTH = new DigisacGateway.Auth("acme.digisac.co", "tok");

    MockRestServiceServer server;
    DigisacRestGateway gateway;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        gateway = new DigisacRestGateway(builder.build());
    }

    @Test
    void meExtractsOnlyIdentityFields() {
        server.expect(requestTo(startsWith(API + "me?")))
                // Sem include de roles o DigiSac não devolve roles, e ninguém vira admin.
                .andExpect(requestTo(containsString("include%5B1%5D=roles")))
                .andExpect(header("Authorization", "Bearer sess"))
                .andRespond(withSuccess("""
                        {"id":"u1","name":"Ana","email":"a@x","accountId":"acc-1","otpSecretKey":"NAO-USAR",
                         "departments":[{"id":"d1","name":"Fiscal"},{"id":"d2","name":"T&I"}],
                         "roles":[{"isAdmin":false},{"isAdmin":true}]}
                        """, MediaType.APPLICATION_JSON));

        DigisacGateway.Me me = gateway.me("acme.digisac.co", "sess");

        assertEquals(new DigisacGateway.Me("u1", "Ana", "acc-1", Set.of("d1", "d2"), true), me);
        server.verify();
    }

    @Test
    void unauthorizedBecomesUnauthorizedException() {
        server.expect(requestTo(startsWith(API + "me?"))).andRespond(withUnauthorizedRequest());
        assertThrows(DigisacGateway.UnauthorizedException.class, () -> gateway.me("acme.digisac.co", "x"));
    }

    @Test
    void serverErrorBecomesUpstreamError() {
        server.expect(requestTo(startsWith(API + "services?"))).andRespond(withServerError());
        assertCode(ErrorCode.UPSTREAM_ERROR, () -> gateway.services(AUTH));
    }

    @Test
    void unexpectedContentTypeBecomesUpstreamError() {
        server.expect(requestTo(startsWith(API + "services?")))
                .andRespond(withSuccess("<html>manutenção</html>", MediaType.TEXT_HTML));
        assertCode(ErrorCode.UPSTREAM_ERROR, () -> gateway.services(AUTH));
    }

    @Test
    void emptyMeBodyBecomesUpstreamError() {
        server.expect(requestTo(startsWith(API + "me?"))).andRespond(withSuccess());
        assertCode(ErrorCode.UPSTREAM_ERROR, () -> gateway.me("acme.digisac.co", "sess"));
    }

    @Test
    void authToStringHidesToken() {
        DigisacGateway.Auth a = new DigisacGateway.Auth("acme.digisac.co", "supersecret123");
        assertFalse(a.toString().contains("supersecret123"));
    }

    @Test
    void contactsByServiceMapsNumberAndTags() {
        server.expect(requestTo(startsWith(API + "contacts?")))
                .andExpect(requestTo(containsString("where%5BserviceId%5D=s1")))
                .andExpect(header("Authorization", "Bearer tok"))
                .andRespond(withSuccess("""
                        {"data":[{"id":"c1","name":"Joao","internalName":"Empresa X","serviceId":"s1",
                                  "data":{"number":"5534999998888"},"tags":[{"id":"t1","label":"VALIDO"}]}]}
                        """, MediaType.APPLICATION_JSON));

        List<DigisacGateway.Contact> contacts = gateway.contactsByService(AUTH, "s1");

        assertEquals(1, contacts.size());
        assertEquals("5534999998888", contacts.get(0).number());
        assertEquals(List.of("VALIDO"), contacts.get(0).tags());
        assertEquals("Empresa X", contacts.get(0).displayName());
    }

    @Test
    void findContactByPhoneSearchesByLastEightDigits() {
        server.expect(requestTo(containsString("%2599998888%25")))
                .andRespond(withSuccess("{\"data\":[]}", MediaType.APPLICATION_JSON));
        assertTrue(gateway.findContactByPhone(AUTH, "s1", "99998888").isEmpty());
        server.verify();
    }

    @Test
    void contactNotFoundIsEmpty() {
        server.expect(requestTo(API + "contacts/c404")).andRespond(withResourceNotFound());
        assertTrue(gateway.contact(AUTH, "c404").isEmpty());
    }

    @Test
    void idsWithPathCharactersAreRejectedWithoutCalling() {
        assertCode(ErrorCode.VALIDATION_ERROR, () -> gateway.contact(AUTH, "../users"));
        server.verify();
    }

    @Test
    void createContactPostsTheExtensionPayload() {
        server.expect(requestTo(API + "contacts"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.internalName").value("Empresa X"))
                .andExpect(jsonPath("$.number").value("553499998888"))
                .andExpect(jsonPath("$.serviceId").value("s1"))
                .andExpect(jsonPath("$.tagIds[0]").value("t1"))
                .andExpect(jsonPath("$.customFields").isEmpty())
                .andRespond(withSuccess("{\"id\":\"c-new\"}", MediaType.APPLICATION_JSON));

        assertEquals("c-new", gateway.createContact(AUTH, "s1", "Empresa X", "553499998888", "t1"));
    }

    @Test
    void transferOmitsEmptyOptionalFields() {
        server.expect(requestTo(API + "contacts/c1/ticket/transfer"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.departmentId").value("d1"))
                .andExpect(jsonPath("$.userId").doesNotExist())
                .andExpect(jsonPath("$.comments").value("urgente"))
                .andRespond(withSuccess());

        gateway.transfer(AUTH, "c1", "d1", null, "urgente");
        server.verify();
    }

    @Test
    void openTicketReturnsFirstOpen() {
        server.expect(requestTo(containsString("where%5BisOpen%5D=true")))
                .andRespond(withSuccess("{\"data\":[{\"userId\":\"u9\",\"departmentId\":\"d2\"}]}",
                        MediaType.APPLICATION_JSON));
        assertEquals(new DigisacGateway.OpenTicket("u9", "d2"), gateway.openTicket(AUTH, "c1").orElseThrow());
    }

    @Test
    void tagIdByLabelFindsExactLabel() {
        server.expect(requestTo(startsWith(API + "tags?")))
                .andRespond(withSuccess("{\"data\":[{\"id\":\"t0\",\"label\":\"VALIDO2\"},{\"id\":\"t1\",\"label\":\"VALIDO\"}]}",
                        MediaType.APPLICATION_JSON));
        assertEquals("t1", gateway.tagIdByLabel(AUTH, "VALIDO").orElseThrow());
    }
}
