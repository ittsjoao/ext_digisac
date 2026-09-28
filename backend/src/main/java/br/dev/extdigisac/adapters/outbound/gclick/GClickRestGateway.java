package br.dev.extdigisac.adapters.outbound.gclick;

import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Supplier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

public final class GClickRestGateway implements GClickGateway {

    static final String BASE = "https://api.gclick.com.br";

    private record Token(String value, Instant expiresAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TokenJson(@JsonProperty("access_token") String accessToken, @JsonProperty("expires_in") long expiresIn) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PhoneJson(String nome, String numero) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ClientJson(long id, String nome, String apelido, String status, String inscricao, List<PhoneJson> telefones) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PageJson(List<ClientJson> content, long totalElements, int totalPages) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record CargoJson(String nome) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ResponsavelJson(long id, String nome, String email, CargoJson cargo) {
    }

    private final RestClient http;
    private final Clock clock;
    private final Map<String, Token> tokens = new ConcurrentHashMap<>();

    public GClickRestGateway(RestClient http, Clock clock) {
        this.http = http;
        this.clock = clock;
    }

    @Override
    public void verify(Credentials c) {
        token(c, true);
    }

    @Override
    public Page clients(Credentials c, int page, int size) {
        PageJson p = authed(c, t -> http.get().uri(BASE + "/clientes?page={p}&size={s}", page, size)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + t).retrieve().body(PageJson.class));
        List<Client> content = p.content() == null ? List.of()
                : p.content().stream().map(GClickRestGateway::toClient).toList();
        return new Page(content, p.totalElements(), p.totalPages());
    }

    @Override
    public List<Responsavel> responsaveis(Credentials c, long clienteId) {
        List<ResponsavelJson> list = authed(c, t -> http.get().uri(BASE + "/clientes/{id}/responsaveis", clienteId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + t).retrieve()
                .body(new ParameterizedTypeReference<List<ResponsavelJson>>() {
                }));
        return list == null ? List.of() : list.stream()
                .map(r -> new Responsavel(r.id(), r.nome(), r.email(), r.cargo() == null ? null : new Cargo(r.cargo().nome())))
                .toList();
    }

    private static Client toClient(ClientJson c) {
        String nome = c.nome() != null ? c.nome() : c.apelido() != null ? c.apelido() : "";
        List<Phone> phones = c.telefones() == null ? List.of() : c.telefones().stream()
                .map(p -> new Phone(p.nome() == null ? "" : p.nome(), p.numero() == null ? "" : p.numero()))
                .toList();
        return new Client(c.id(), nome, c.apelido() == null ? "" : c.apelido(), c.status() == null ? "" : c.status(),
                c.inscricao() == null ? "" : c.inscricao(), phones);
    }

    private <T> T authed(Credentials c, Function<String, T> fn) {
        try {
            return data(() -> fn.apply(token(c, false)));
        } catch (UnauthorizedException e) {
            tokens.remove(c.clientId());
            return data(() -> fn.apply(token(c, true)));
        }
    }

    private static <T> T data(Supplier<T> fn) {
        try {
            return fn.get();
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new UnauthorizedException();
        } catch (HttpClientErrorException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR,
                    "G-Click recusou a requisição (" + e.getStatusCode().value() + ").");
        } catch (HttpServerErrorException | ResourceAccessException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "G-Click indisponível.");
        } catch (RestClientException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "G-Click indisponível.");
        }
    }

    private String token(Credentials c, boolean force) {
        Token cached = tokens.get(c.clientId());
        if (!force && cached != null && clock.instant().isBefore(cached.expiresAt())) {
            return cached.value();
        }
        var form = new LinkedMultiValueMap<String, String>();
        form.add("client_id", c.clientId());
        form.add("client_secret", c.clientSecret());
        form.add("grant_type", "client_credentials");
        TokenJson t;
        try {
            t = http.post().uri(BASE + "/oauth/token").contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form).retrieve().body(TokenJson.class);
        } catch (HttpClientErrorException e) {
            throw new UnauthorizedException();
        } catch (HttpServerErrorException | ResourceAccessException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "G-Click indisponível.");
        } catch (RestClientException e) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "G-Click indisponível.");
        }
        if (t == null) {
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "G-Click indisponível.");
        }
        tokens.put(c.clientId(), new Token(t.accessToken(), clock.instant().plusSeconds(Math.max(t.expiresIn() - 60, 0))));
        return t.accessToken();
    }
}
