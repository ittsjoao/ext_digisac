package br.dev.extdigisac.application.port.out;

import br.dev.extdigisac.domain.Tenant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantRepository {

    Optional<Tenant> findByHost(String host);

    Optional<Tenant> findById(UUID id);

    List<Tenant> findAll();

    void insert(Tenant tenant);

    void update(Tenant tenant);
}
