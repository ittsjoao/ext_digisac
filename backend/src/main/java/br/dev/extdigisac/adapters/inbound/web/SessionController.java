package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.OnboardingService;
import br.dev.extdigisac.application.SessionService;
import br.dev.extdigisac.domain.Tenant;
import br.dev.extdigisac.domain.TenantStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SessionController {

    record SessionRequest(@NotBlank String host, @NotBlank String sessionBearer) {
    }

    record GClickBody(@NotBlank String clientId, @NotBlank String clientSecret) {

        OnboardingService.GClickInput toInput() {
            return new OnboardingService.GClickInput(clientId, clientSecret);
        }
    }

    record RegisterRequest(@NotBlank String host, @NotBlank String sessionBearer, @NotBlank String name,
            @NotBlank String digisacToken, @Valid GClickBody gclick) {
    }

    record CredentialsRequest(@NotBlank String host, @NotBlank String sessionBearer, String digisacToken,
            @Valid GClickBody gclick) {
    }

    record UserView(String id, String name, @JsonProperty("isAdmin") boolean admin) {
    }

    record TenantView(String name, boolean gclickEnabled, LocalDate validUntil) {
    }

    record SessionResponse(String token, Instant expiresAt, UserView user, TenantView tenant) {
    }

    record TenantStatusView(UUID id, String name, TenantStatus status) {

        static TenantStatusView of(Tenant t) {
            return new TenantStatusView(t.id(), t.name(), t.status());
        }
    }

    private final SessionService sessions;
    private final OnboardingService onboarding;

    public SessionController(SessionService sessions, OnboardingService onboarding) {
        this.sessions = sessions;
        this.onboarding = onboarding;
    }

    @PostMapping("/auth/session")
    SessionResponse session(@Valid @RequestBody SessionRequest r) {
        var s = sessions.exchange(r.host(), r.sessionBearer());
        return new SessionResponse(s.token().token(), s.token().expiresAt(),
                new UserView(s.actor().userId(), s.actor().userName(), s.actor().admin()),
                new TenantView(s.tenant().name(), s.tenant().gclickEnabled(), s.tenant().validUntil()));
    }

    @PostMapping("/tenants")
    @ResponseStatus(HttpStatus.CREATED)
    TenantStatusView register(@Valid @RequestBody RegisterRequest r) {
        return TenantStatusView.of(onboarding.register(new OnboardingService.RegisterCommand(r.host(),
                r.sessionBearer(), r.name(), r.digisacToken(), r.gclick() == null ? null : r.gclick().toInput())));
    }

    @PutMapping("/tenants/credentials")
    TenantStatusView credentials(@Valid @RequestBody CredentialsRequest r) {
        return TenantStatusView.of(onboarding.updateCredentials(new OnboardingService.CredentialsCommand(r.host(),
                r.sessionBearer(), r.digisacToken(), r.gclick() == null ? null : r.gclick().toInput())));
    }
}
