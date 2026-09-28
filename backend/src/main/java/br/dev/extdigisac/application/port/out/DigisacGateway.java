package br.dev.extdigisac.application.port.out;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface DigisacGateway {

    record Auth(String host, String token) {

        @Override
        public String toString() {
            return "Auth[host=" + host + ", token=***]";
        }
    }

    record Me(String id, String name, String accountId, Set<String> departmentIds, boolean admin) {
    }

    record Named(String id, String name) {
    }

    record User(String id, String name, String email, List<Named> departments) {
    }

    record Contact(String id, String name, String internalName, String serviceId, String number, List<String> tags) {

        public String displayName() {
            return internalName != null && !internalName.isBlank() ? internalName : name;
        }
    }

    record OpenTicket(String userId, String departmentId) {
    }

    /** O DigiSac respondeu 401 para o token usado. */
    final class UnauthorizedException extends RuntimeException {

        public UnauthorizedException() {
            super("DigiSac recusou o token");
        }
    }

    Me me(String host, String bearer);

    List<Named> services(Auth auth);

    List<Named> departments(Auth auth);

    List<User> users(Auth auth);

    List<Contact> contactsByService(Auth auth, String serviceId);

    Optional<Contact> findContactByPhone(Auth auth, String serviceId, String last8);

    Optional<Contact> contact(Auth auth, String contactId);

    Optional<String> tagIdByLabel(Auth auth, String label);

    String createContact(Auth auth, String serviceId, String internalName, String number, String tagId);

    void updateContact(Auth auth, String contactId, String internalName, String tagId);

    Optional<OpenTicket> openTicket(Auth auth, String contactId);

    void transfer(Auth auth, String contactId, String departmentId, String userId, String comments);

    void sendBotMessage(Auth auth, String contactId, String text);
}
