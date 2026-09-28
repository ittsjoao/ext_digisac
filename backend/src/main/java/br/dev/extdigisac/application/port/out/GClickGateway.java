package br.dev.extdigisac.application.port.out;

import java.util.List;

public interface GClickGateway {

    record Credentials(String clientId, String clientSecret) {

        @Override
        public String toString() {
            return "Credentials[clientId=" + clientId + ", clientSecret=***]";
        }
    }

    record Phone(String nome, String numero) {
    }

    record Client(long id, String nome, String apelido, String status, String inscricao, List<Phone> telefones) {
    }

    record Page(List<Client> content, long totalElements, int totalPages) {
    }

    record Cargo(String nome) {
    }

    record Responsavel(long id, String nome, String email, Cargo cargo) {
    }

    /** O G-Click recusou as credenciais (OAuth) ou o token. */
    final class UnauthorizedException extends RuntimeException {

        public UnauthorizedException() {
            super("G-Click recusou as credenciais");
        }
    }

    void verify(Credentials credentials);

    Page clients(Credentials credentials, int page, int size);

    List<Responsavel> responsaveis(Credentials credentials, long clienteId);
}
