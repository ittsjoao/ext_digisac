package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.TicketingService;
import br.dev.extdigisac.application.port.out.DigisacGateway.Contact;
import br.dev.extdigisac.domain.Actor;
import br.dev.extdigisac.domain.TicketRecord;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TicketingController {

    record RegisterContactRequest(@NotBlank String serviceId, @NotBlank String name, @NotBlank String phone,
            String departmentId) {
    }

    record OpenTicketRequest(@NotBlank String serviceId, @NotBlank String contactId, @NotBlank String departmentId,
            String userId, String comment, Long gclickClientId) {
    }

    private final TicketingService ticketing;

    public TicketingController(TicketingService ticketing) {
        this.ticketing = ticketing;
    }

    @GetMapping("/catalog")
    TicketingService.Catalog catalog(Actor actor) {
        return ticketing.catalog(actor);
    }

    @GetMapping("/contacts")
    List<Contact> contacts(Actor actor, @RequestParam String serviceId) {
        return ticketing.contacts(actor, serviceId);
    }

    @GetMapping("/contacts/by-phone")
    ResponseEntity<Contact> byPhone(Actor actor, @RequestParam String serviceId, @RequestParam String phone) {
        return ticketing.contactByPhone(actor, serviceId, phone).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/contacts/register")
    TicketingService.RegisterResult register(Actor actor, @Valid @RequestBody RegisterContactRequest r) {
        return ticketing.registerContact(actor,
                new TicketingService.RegisterContactCommand(r.serviceId(), r.name(), r.phone(), r.departmentId()));
    }

    @GetMapping("/contacts/{id}/open-ticket")
    ResponseEntity<TicketingService.OpenTicketInfo> openTicketOf(Actor actor, @PathVariable String id) {
        return ticketing.openTicketOf(actor, id).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    TicketRecord openTicket(Actor actor, @Valid @RequestBody OpenTicketRequest r) {
        return ticketing.openTicket(actor, new TicketingService.OpenTicketCommand(r.serviceId(), r.contactId(),
                r.departmentId(), r.userId(), r.comment(), r.gclickClientId()));
    }
}
