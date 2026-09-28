package br.dev.extdigisac.testing;

import br.dev.extdigisac.application.port.out.GClickGateway;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class FakeGClick implements GClickGateway {

    public volatile List<Client> all = new ArrayList<>();
    public final Map<Long, List<Responsavel>> responsaveis = new HashMap<>();
    public final Set<String> rejectedClientIds = new HashSet<>();
    public final AtomicInteger pageCalls = new AtomicInteger();

    public void reset() {
        all = new ArrayList<>();
        responsaveis.clear();
        rejectedClientIds.clear();
        pageCalls.set(0);
    }

    @Override
    public void verify(Credentials c) {
        if (rejectedClientIds.contains(c.clientId())) {
            throw new UnauthorizedException();
        }
    }

    @Override
    public Page clients(Credentials c, int page, int size) {
        verify(c);
        pageCalls.incrementAndGet();
        List<Client> snapshot = all;
        int from = Math.min(page * size, snapshot.size());
        int to = Math.min(from + size, snapshot.size());
        int totalPages = (int) Math.ceil(snapshot.size() / (double) size);
        return new Page(List.copyOf(snapshot.subList(from, to)), snapshot.size(), totalPages);
    }

    @Override
    public List<Responsavel> responsaveis(Credentials c, long clienteId) {
        verify(c);
        return responsaveis.getOrDefault(clienteId, List.of());
    }
}
