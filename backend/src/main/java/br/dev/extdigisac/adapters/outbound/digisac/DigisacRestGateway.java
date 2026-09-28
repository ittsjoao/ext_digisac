package br.dev.extdigisac.adapters.outbound.digisac;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

public final class DigisacRestGateway implements DigisacGateway {

    private static final Pattern ID = Pattern.compile("^[A-Za-z0-9-]{1,64}$");

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PageJson<T>(List<T> data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record IdJson(String id, String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RoleJson(@JsonProperty("isAdmin") boolean admin) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record MeJson(String id, String name, String accountId, List<IdJson> departments, List<RoleJson> roles) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TagJson(String id, String label) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DataJson(String number) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ContactJson(String id, String name, String internalName, String serviceId, DataJson data, List<TagJson> tags) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record UserJson(String id, String name, String email, List<IdJson> departments) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TicketJson(String userId, String departmentId) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record CreatedJson(String id) {
    }

    private static final ParameterizedTypeReference<PageJson<IdJson>> IDS = new ParameterizedTypeReference<>() {
    };
    private static final ParameterizedTypeReference<PageJson<UserJson>> USERS = new ParameterizedTypeReference<>() {
    };
    private static final ParameterizedTypeReference<PageJson<ContactJson>> CONTACTS = new ParameterizedTypeReference<>() {
    };
    private static final ParameterizedTypeReference<PageJson<TagJson>> TAGS = new ParameterizedTypeReference<>() {
    };
    private static final ParameterizedTypeReference<PageJson<TicketJson>> TICKETS = new ParameterizedTypeReference<>() {
    };

    private final RestClient http;

    public DigisacRestGateway(RestClient http) {
        this.http = http;
    }

    @Override
    public Me me(String host, String bearer) {
        MeJson me = call(() -> get(host, bearer, "me", params("include[0]", "departments", "include[1]", "roles")).body(MeJson.class));
        if (me == null) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "DigiSac indisponível.");
        }
        Set<String> depts = me.departments() == null ? Set.of()
                : me.departments().stream().map(IdJson::id).collect(Collectors.toUnmodifiableSet());
        boolean admin = me.roles() != null && me.roles().stream().anyMatch(RoleJson::admin);
        return new Me(me.id(), me.name(), me.accountId(), depts, admin);
    }

    @Override
    public List<Named> services(Auth a) {
        return page(a, "services", params("query", "{\"attributes\":[\"id\",\"name\"]}", "perPage", "100"), IDS)
                .stream().map(i -> new Named(i.id(), i.name())).toList();
    }

    @Override
    public List<Named> departments(Auth a) {
        return page(a, "departments", params("perPage", "100", "attributes[0]", "id", "attributes[1]", "name"), IDS)
                .stream().map(i -> new Named(i.id(), i.name())).toList();
    }

    @Override
    public List<User> users(Auth a) {
        String query = "{\"attributes\":[\"id\",\"name\",\"email\"],\"where\":{\"archivedAt\":null},"
                + "\"include\":[{\"model\":\"departments\",\"attributes\":[\"id\",\"name\"]}],\"page\":1,\"perPage\":1000}";
        return page(a, "users", params("query", query), USERS).stream()
                .map(u -> new User(u.id(), u.name(), u.email(), u.departments() == null ? List.of()
                        : u.departments().stream().map(d -> new Named(d.id(), d.name())).toList()))
                .toList();
    }

    @Override
    public List<Contact> contactsByService(Auth a, String serviceId) {
        String query = "{\"attributes\":[\"id\",\"name\",\"internalName\",\"serviceId\",\"data\"],"
                + "\"include\":[{\"model\":\"tags\",\"attributes\":[\"id\",\"label\"],\"required\":true}]}";
        return page(a, "contacts", params("where[serviceId]", seg(serviceId), "perPage", "2000", "query", query), CONTACTS)
                .stream().map(DigisacRestGateway::toContact).toList();
    }

    @Override
    public Optional<Contact> findContactByPhone(Auth a, String serviceId, String last8) {
        return page(a, "contacts", params("where[data.number][$iLike]", "%" + last8 + "%",
                "where[serviceId]", seg(serviceId), "include[0]", "tags"), CONTACTS)
                .stream().findFirst().map(DigisacRestGateway::toContact);
    }

    @Override
    public Optional<Contact> contact(Auth a, String contactId) {
        String path = "contacts/" + seg(contactId);
        try {
            ContactJson c = call(() -> get(a.host(), a.token(), path, Map.of()).body(ContactJson.class));
            return Optional.ofNullable(c).map(DigisacRestGateway::toContact);
        } catch (AppException e) {
            if (e.code() == ErrorCode.NOT_FOUND) {
                return Optional.empty();
            }
            throw e;
        }
    }

    @Override
    public Optional<String> tagIdByLabel(Auth a, String label) {
        return page(a, "tags", params("perPage", "100"), TAGS).stream()
                .filter(t -> label.equals(t.label())).map(TagJson::id).findFirst();
    }

    @Override
    public String createContact(Auth a, String serviceId, String internalName, String number, String tagId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("internalName", internalName);
        body.put("number", number);
        body.put("serviceId", serviceId);
        body.put("tagIds", List.of(tagId));
        body.put("defaultDepartmentId", null);
        body.put("customFields", List.of());
        CreatedJson created = call(() -> http.post().uri(uri(a.host(), "contacts", Map.of()))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + a.token())
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(CreatedJson.class));
        return created.id();
    }

    @Override
    public void updateContact(Auth a, String contactId, String internalName, String tagId) {
        String path = "contacts/" + seg(contactId);
        Map<String, Object> body = Map.of("internalName", internalName, "tagIds", List.of(tagId));
        call(() -> http.put().uri(uri(a.host(), path, Map.of()))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + a.token())
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().toBodilessEntity());
    }

    @Override
    public Optional<OpenTicket> openTicket(Auth a, String contactId) {
        return page(a, "tickets", params("perPage", "1", "where[contactId]", seg(contactId), "where[isOpen]", "true"), TICKETS)
                .stream().findFirst().map(t -> new OpenTicket(t.userId(), t.departmentId()));
    }

    @Override
    public void transfer(Auth a, String contactId, String departmentId, String userId, String comments) {
        String path = "contacts/" + seg(contactId) + "/ticket/transfer";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("departmentId", seg(departmentId));
        if (userId != null) {
            body.put("userId", seg(userId));
        }
        if (comments != null) {
            body.put("comments", comments);
        }
        call(() -> http.post().uri(uri(a.host(), path, Map.of()))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + a.token())
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().toBodilessEntity());
    }

    @Override
    public void sendBotMessage(Auth a, String contactId, String text) {
        Map<String, Object> body = Map.of("text", text, "type", "chat", "contactId", seg(contactId),
                "origin", "bot", "dontOpenTicket", true);
        call(() -> http.post().uri(uri(a.host(), "messages", Map.of()))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + a.token())
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().toBodilessEntity());
    }

    private <T> List<T> page(Auth a, String path, Map<String, String> params, ParameterizedTypeReference<PageJson<T>> type) {
        PageJson<T> p = call(() -> get(a.host(), a.token(), path, params).body(type));
        return p == null || p.data() == null ? List.of() : p.data();
    }

    private RestClient.ResponseSpec get(String host, String token, String path, Map<String, String> params) {
        return http.get().uri(uri(host, path, params))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve();
    }

    private static <T> T call(Supplier<T> fn) {
        try {
            return fn.get();
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new UnauthorizedException();
        } catch (HttpClientErrorException.NotFound e) {
            throw new AppException(ErrorCode.NOT_FOUND, "Registro não encontrado no DigiSac.");
        } catch (HttpClientErrorException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR,
                    "DigiSac recusou a requisição (" + e.getStatusCode().value() + ").");
        } catch (HttpServerErrorException | ResourceAccessException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "DigiSac indisponível.");
        } catch (RestClientException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "DigiSac indisponível.");
        }
    }

    /** Monta a URL sem template: os parâmetros do DigiSac carregam JSON com chaves. */
    static URI uri(String host, String path, Map<String, String> params) {
        StringBuilder sb = new StringBuilder("https://").append(host).append("/api/v1/").append(path);
        String sep = "?";
        for (Map.Entry<String, String> e : params.entrySet()) {
            sb.append(sep).append(enc(e.getKey())).append('=').append(enc(e.getValue()));
            sep = "&";
        }
        return URI.create(sb.toString());
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    private static Map<String, String> params(String... keyValues) {
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            m.put(keyValues[i], keyValues[i + 1]);
        }
        return m;
    }

    /** IDs vêm do cliente: sem isso, "../users" viraria outro endpoint do DigiSac. */
    private static String seg(String id) {
        if (id == null || !ID.matcher(id).matches()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Identificador inválido.");
        }
        return id;
    }

    private static Contact toContact(ContactJson c) {
        List<String> tags = c.tags() == null ? List.of() : c.tags().stream().map(TagJson::label).toList();
        return new Contact(c.id(), c.name(), c.internalName(), c.serviceId(),
                c.data() == null ? null : c.data().number(), tags);
    }
}
