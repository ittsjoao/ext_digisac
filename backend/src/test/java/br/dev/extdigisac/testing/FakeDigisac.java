package br.dev.extdigisac.testing;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** DigiSac em memória; o token "tok" é o que os Samples cifram. */
public class FakeDigisac implements DigisacGateway {

    public final Map<String, Me> meByToken = new HashMap<>();
    public final Set<String> rejectedTokens = new HashSet<>();
    public List<Named> services = new ArrayList<>();
    public List<Named> departments = new ArrayList<>();
    public List<User> users = new ArrayList<>();
    public final Map<String, Contact> contacts = new HashMap<>();
    public final Map<String, String> tags = new HashMap<>();
    public final Map<String, OpenTicket> openTickets = new HashMap<>();
    public final List<Map<String, String>> created = new ArrayList<>();
    public final List<Map<String, String>> updated = new ArrayList<>();
    public final List<Map<String, String>> transfers = new ArrayList<>();
    public final List<Map<String, String>> messages = new ArrayList<>();

    public void reset() {
        meByToken.clear();
        rejectedTokens.clear();
        services = new ArrayList<>();
        departments = new ArrayList<>();
        users = new ArrayList<>();
        contacts.clear();
        tags.clear();
        openTickets.clear();
        created.clear();
        updated.clear();
        transfers.clear();
        messages.clear();
    }

    private void check(Auth auth) {
        if (rejectedTokens.contains(auth.token())) {
            throw new UnauthorizedException();
        }
    }

    @Override
    public Me me(String host, String bearer) {
        if (rejectedTokens.contains(bearer) || !meByToken.containsKey(bearer)) {
            throw new UnauthorizedException();
        }
        return meByToken.get(bearer);
    }

    @Override
    public List<Named> services(Auth auth) {
        check(auth);
        return services;
    }

    @Override
    public List<Named> departments(Auth auth) {
        check(auth);
        return departments;
    }

    @Override
    public List<User> users(Auth auth) {
        check(auth);
        return users;
    }

    @Override
    public List<Contact> contactsByService(Auth auth, String serviceId) {
        check(auth);
        return contacts.values().stream().filter(c -> serviceId.equals(c.serviceId())).toList();
    }

    @Override
    public Optional<Contact> findContactByPhone(Auth auth, String serviceId, String last8) {
        check(auth);
        return contacts.values().stream()
                .filter(c -> serviceId.equals(c.serviceId()) && c.number() != null && c.number().endsWith(last8))
                .findFirst();
    }

    @Override
    public Optional<Contact> contact(Auth auth, String contactId) {
        check(auth);
        return Optional.ofNullable(contacts.get(contactId));
    }

    @Override
    public Optional<String> tagIdByLabel(Auth auth, String label) {
        check(auth);
        return Optional.ofNullable(tags.get(label));
    }

    @Override
    public String createContact(Auth auth, String serviceId, String internalName, String number, String tagId) {
        check(auth);
        String id = "c-new-" + (created.size() + 1);
        created.add(Map.of("serviceId", serviceId, "internalName", internalName, "number", number, "tagId", tagId));
        contacts.put(id, new Contact(id, internalName, internalName, serviceId, number, List.of("VALIDO")));
        return id;
    }

    @Override
    public void updateContact(Auth auth, String contactId, String internalName, String tagId) {
        check(auth);
        updated.add(Map.of("contactId", contactId, "internalName", internalName, "tagId", tagId));
    }

    @Override
    public Optional<OpenTicket> openTicket(Auth auth, String contactId) {
        check(auth);
        return Optional.ofNullable(openTickets.get(contactId));
    }

    @Override
    public void transfer(Auth auth, String contactId, String departmentId, String userId, String comments) {
        check(auth);
        Map<String, String> t = new HashMap<>();
        t.put("contactId", contactId);
        t.put("departmentId", departmentId);
        t.put("userId", userId);
        t.put("comments", comments);
        transfers.add(t);
    }

    @Override
    public void sendBotMessage(Auth auth, String contactId, String text) {
        check(auth);
        messages.add(Map.of("contactId", contactId, "text", text));
    }
}
