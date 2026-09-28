package br.dev.extdigisac.testing;

import br.dev.extdigisac.application.port.out.TenantRepository;
import br.dev.extdigisac.domain.Tenant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public final class FakeTenantRepository implements TenantRepository {

    public final Map<UUID, Tenant> rows = new LinkedHashMap<>();

    @Override
    public Optional<Tenant> findByHost(String host) {
        return rows.values().stream().filter(t -> t.host().equals(host)).findFirst();
    }

    @Override
    public Optional<Tenant> findById(UUID id) {
        return Optional.ofNullable(rows.get(id));
    }

    @Override
    public List<Tenant> findAll() {
        return new ArrayList<>(rows.values());
    }

    @Override
    public void insert(Tenant tenant) {
        rows.put(tenant.id(), tenant);
    }

    @Override
    public void update(Tenant tenant) {
        rows.put(tenant.id(), tenant);
    }
}
