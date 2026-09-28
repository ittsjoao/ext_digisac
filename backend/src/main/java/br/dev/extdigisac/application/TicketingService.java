package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.DigisacGateway;
import br.dev.extdigisac.application.port.out.DigisacGateway.Contact;
import br.dev.extdigisac.application.port.out.DigisacGateway.Named;
import br.dev.extdigisac.application.port.out.DigisacGateway.OpenTicket;
import br.dev.extdigisac.application.port.out.DigisacGateway.User;
import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.application.port.out.PermissionRepository;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.Allowed;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import br.dev.extdigisac.domain.PermissionPolicy;
import br.dev.extdigisac.domain.PhoneKey;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.Texts;
import br.dev.extdigisac.domain.TicketRecord;
import java.time.Clock;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class TicketingService {

    public record Catalog(List<Named> services, List<Named> departments, List<User> users) {
    }

    public enum RegisterOutcome { CREATED, UPDATED }

    public record RegisterContactCommand(String serviceId, String name, String phone, String departmentId) {
    }

    public record RegisterResult(String contactId, RegisterOutcome outcome) {
    }

    public record OpenTicketInfo(String userName, String departmentName) {
    }

    public record OpenTicketCommand(String serviceId, String contactId, String departmentId, String userId,
            String comment, Long gclickClientId) {
    }

    private static final String VALIDO = "VALIDO";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(Tenant.ZONE);
    private static final String REGISTERED = "📋 Novo Número Cadastrado\n\nO colaborador %s realizou um novo cadastro "
            + "de número.\n\n👤 Colaborador — %s\n🏢 Departamento — %s\n📲 Cadastro via — Extensão\n🔗 Conexão — %s\n"
            + "📅 Data — %s";
    private static final String DUPLICATE = "⚠️ Tentativa de Cadastro Duplicado\n\nO colaborador %s tentou cadastrar "
            + "um número que já existe com tags no DigiSac.\n\n👤 Colaborador — %s\n🏢 Departamento — %s\n📲 Cadastro "
            + "via — Extensão\n🔗 Conexão — %s\n📅 Data — %s";

    private final TenantAccess access;
    private final TenantDigisac digisac;
    private final PermissionRepository permissions;
    private final HistoryRepository history;
    private final GClickService gclick;
    private final Clock clock;

    public TicketingService(TenantAccess access, TenantDigisac digisac, PermissionRepository permissions,
            HistoryRepository history, GClickService gclick, Clock clock) {
        this.access = access;
        this.digisac = digisac;
        this.permissions = permissions;
        this.history = history;
        this.gclick = gclick;
        this.clock = clock;
    }

    public Catalog catalog(Actor a) {
        Tenant t = access.requireActive(a.tenantId());
        Allowed allowed = allowed(a);
        List<Named> services = digisac.call(t, DigisacGateway::services).stream()
                .filter(s -> allowed.service(s.id())).toList();
        List<Named> departments = digisac.call(t, DigisacGateway::departments).stream()
                .filter(d -> allowed.target(d.id())).toList();
        return new Catalog(services, departments, digisac.call(t, DigisacGateway::users));
    }

    public List<Contact> contacts(Actor a, String serviceId) {
        Tenant t = access.requireActive(a.tenantId());
        allowed(a).requireService(serviceId);
        return digisac.call(t, (d, x) -> d.contactsByService(x, serviceId));
    }

    public Optional<Contact> contactByPhone(Actor a, String serviceId, String phone) {
        Tenant t = access.requireActive(a.tenantId());
        allowed(a).requireService(serviceId);
        String last8 = last8(PhoneKey.of(phone));
        return digisac.call(t, (d, x) -> d.findContactByPhone(x, serviceId, last8));
    }

    public RegisterResult registerContact(Actor a, RegisterContactCommand c) {
        Tenant t = access.requireActive(a.tenantId());
        allowed(a).requireService(c.serviceId());
        String name = Texts.requireText(c.name(), "Informe o nome do contato.");
        String key = PhoneKey.of(c.phone());
        String last8 = last8(key);
        String number = key.length() == 10 ? "55" + key : key;
        Optional<Contact> existing = digisac.call(t, (d, x) -> d.findContactByPhone(x, c.serviceId(), last8));
        if (existing.isPresent() && !existing.get().tags().isEmpty()) {
            notify(t, a, c, DUPLICATE);
            throw new AppException(ErrorCode.DUPLICATE_CONTACT, "Este contato já existe no DigiSac com tags associadas.");
        }
        String tagId = digisac.call(t, (d, x) -> d.tagIdByLabel(x, VALIDO))
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Tag VALIDO não encontrada no DigiSac."));
        RegisterResult result;
        if (existing.isPresent()) {
            String id = existing.get().id();
            digisac.run(t, (d, x) -> d.updateContact(x, id, name, tagId));
            result = new RegisterResult(id, RegisterOutcome.UPDATED);
        } else {
            String id = digisac.call(t, (d, x) -> d.createContact(x, c.serviceId(), name, number, tagId));
            result = new RegisterResult(id, RegisterOutcome.CREATED);
        }
        notify(t, a, c, REGISTERED);
        return result;
    }

    public Optional<OpenTicketInfo> openTicketOf(Actor a, String contactId) {
        Tenant t = access.requireActive(a.tenantId());
        return digisac.call(t, (d, x) -> d.openTicket(x, contactId)).map(o -> describe(t, o));
    }

    public TicketRecord openTicket(Actor a, OpenTicketCommand c) {
        Tenant t = access.requireActive(a.tenantId());
        Allowed allowed = allowed(a);
        allowed.requireService(c.serviceId());
        allowed.requireTarget(c.departmentId());
        Contact contact = digisac.call(t, (d, x) -> d.contact(x, c.contactId()))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Contato não encontrado."));
        if (!c.serviceId().equals(contact.serviceId())) {
            throw new AppException(ErrorCode.FORBIDDEN, "O contato não pertence ao serviço informado.");
        }
        Optional<OpenTicketInfo> open = openTicketOf(a, c.contactId());
        if (open.isPresent()) {
            throw new AppException(ErrorCode.OPEN_TICKET_EXISTS, "Este contato já possui um chamado em aberto com "
                    + open.get().userName() + " do departamento " + open.get().departmentName() + ".");
        }
        String comment = Texts.blankToNull(c.comment());
        String userId = Texts.blankToNull(c.userId());
        String gclickName = gclickName(t, c.gclickClientId());
        digisac.run(t, (d, x) -> d.transfer(x, c.contactId(), c.departmentId(), userId, comment));
        TicketRecord r = new TicketRecord(UUID.randomUUID(), t.id(), a.userId(), a.userName(), contact.id(),
                contact.displayName(), c.serviceId(), c.departmentId(), userId, gclickName, comment != null,
                clock.instant());
        history.insert(r);
        return r;
    }

    private OpenTicketInfo describe(Tenant t, OpenTicket o) {
        String user = digisac.call(t, DigisacGateway::users).stream().filter(u -> u.id().equals(o.userId()))
                .map(User::name).findFirst().orElse("usuário desconhecido");
        String dept = digisac.call(t, DigisacGateway::departments).stream().filter(d -> d.id().equals(o.departmentId()))
                .map(Named::name).findFirst().orElse("departamento desconhecido");
        return new OpenTicketInfo(user, dept);
    }

    private String gclickName(Tenant t, Long clienteId) {
        if (clienteId == null) {
            return null;
        }
        try {
            return gclick.clientName(t, clienteId).orElse(null);
        } catch (RuntimeException e) {
            return null; // ponytail: rótulo do histórico é best-effort; não bloqueia o chamado
        }
    }

    private Allowed allowed(Actor a) {
        return PermissionPolicy.resolve(a, permissions.findByTenant(a.tenantId()));
    }

    private static String last8(String key) {
        if (key.length() < 8) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Telefone inválido.");
        }
        return key.substring(key.length() - 8);
    }

    private void notify(Tenant t, Actor a, RegisterContactCommand c, String template) {
        if (t.notifyContactId() == null) {
            return;
        }
        try {
            String dept = c.departmentId() == null || !a.deptIds().contains(c.departmentId()) ? ""
                    : digisac.call(t, DigisacGateway::departments).stream()
                            .filter(d -> d.id().equals(c.departmentId())).map(Named::name).findFirst().orElse("");
            String service = digisac.call(t, DigisacGateway::services).stream()
                    .filter(s -> s.id().equals(c.serviceId())).map(Named::name).findFirst().orElse("");
            String text = template.formatted(a.userName(), a.userName(), dept, service, DATE.format(clock.instant()));
            digisac.run(t, (d, x) -> d.sendBotMessage(x, t.notifyContactId(), text));
        } catch (RuntimeException e) {
            // ponytail: notificação é best-effort, como no front atual (.catch(() => {}))
        }
    }
}
