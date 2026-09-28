package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.AdminTenantService;
import br.dev.extdigisac.application.OnboardingService;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/tenants")
public class AdminController {

    record GClickBody(@NotBlank String clientId, @NotBlank String clientSecret) {

        OnboardingService.GClickInput toInput() {
            return new OnboardingService.GClickInput(clientId, clientSecret);
        }
    }

    record CreateRequest(@NotBlank String host, @NotBlank String name, @NotBlank String digisacToken,
            @Valid GClickBody gclick, LocalDate validUntil) {
    }

    record PatchRequest(TenantStatus status, LocalDate validUntil, String name, Boolean gclickEnabled,
            String notifyContactId) {
    }

    record RenewRequest(@Min(1) @Max(366) int days) {
    }

    record CredentialsRequest(String digisacToken, @Valid GClickBody gclick) {
    }

    /** Nunca devolve os tokens cifrados. */
    record TenantView(UUID id, String host, String name, TenantStatus status, LocalDate validUntil,
            boolean gclickEnabled, String notifyContactId, String registeredBy, Instant createdAt) {

        static TenantView of(Tenant t) {
            return new TenantView(t.id(), t.host(), t.name(), t.status(), t.validUntil(), t.gclickEnabled(),
                    t.notifyContactId(), t.registeredBy(), t.createdAt());
        }
    }

    private final AdminTenantService admin;

    public AdminController(AdminTenantService admin) {
        this.admin = admin;
    }

    @GetMapping
    List<AdminTenantService.TenantSummary> list() {
        return admin.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    TenantView create(@Valid @RequestBody CreateRequest r) {
        return TenantView.of(admin.create(new AdminTenantService.CreateCommand(r.host(), r.name(), r.digisacToken(),
                r.gclick() == null ? null : r.gclick().toInput(), r.validUntil())));
    }

    @PatchMapping("/{id}")
    TenantView patch(@PathVariable UUID id, @RequestBody PatchRequest r) {
        return TenantView.of(admin.patch(id, new AdminTenantService.PatchCommand(r.status(), r.validUntil(), r.name(),
                r.gclickEnabled(), r.notifyContactId())));
    }

    @PostMapping("/{id}/renew")
    TenantView renew(@PathVariable UUID id, @Valid @RequestBody RenewRequest r) {
        return TenantView.of(admin.renew(id, r.days()));
    }

    @PutMapping("/{id}/credentials")
    TenantView credentials(@PathVariable UUID id, @Valid @RequestBody CredentialsRequest r) {
        return TenantView.of(admin.credentials(id, r.digisacToken(), r.gclick() == null ? null : r.gclick().toInput()));
    }
}
