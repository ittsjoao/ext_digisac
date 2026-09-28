package br.dev.extdigisac.application;

import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.application.port.out.GClickGateway.Client;
import br.dev.extdigisac.application.port.out.GClickGateway.Credentials;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Clientes G-Click em memória, por empresa. Uma indexação por vez por empresa; cache de 6 h.
 * ponytail: memória de uma instância só; reinício reindexa (~7 s por empresa).
 */
public class GClickIndex {

    public record Progress(long loaded, long total, boolean running, String error) {
    }

    static final Duration MAX_AGE = Duration.ofHours(6);
    private static final int PAGE_SIZE = 100;
    private static final int CONCURRENCY = 6;

    private record Snapshot(List<Client> clients, Instant loadedAt) {
    }

    private final GClickGateway gclick;
    private final Clock clock;
    private final ExecutorService background = Executors.newVirtualThreadPerTaskExecutor();
    private final Map<UUID, Snapshot> snapshots = new ConcurrentHashMap<>();
    private final Map<UUID, CompletableFuture<Snapshot>> running = new ConcurrentHashMap<>();
    private final Map<UUID, Progress> progress = new ConcurrentHashMap<>();

    public GClickIndex(GClickGateway gclick, Clock clock) {
        this.gclick = gclick;
        this.clock = clock;
    }

    /** Serve o cache vencido e atualiza em segundo plano; sem cache, espera a indexação. */
    public List<Client> clients(UUID tenantId, Credentials credentials) {
        Snapshot s = snapshots.get(tenantId);
        if (s == null) {
            return join(refresh(tenantId, credentials)).clients();
        }
        if (clock.instant().isAfter(s.loadedAt().plus(MAX_AGE))) {
            refresh(tenantId, credentials);
        }
        return s.clients();
    }

    public List<Client> reload(UUID tenantId, Credentials credentials) {
        return join(refresh(tenantId, credentials)).clients();
    }

    public Progress progress(UUID tenantId) {
        return progress.getOrDefault(tenantId, new Progress(0, 0, false, null));
    }

    public boolean isLoaded(UUID tenantId) {
        return snapshots.containsKey(tenantId);
    }

    public void evict(UUID tenantId) {
        snapshots.remove(tenantId);
        progress.remove(tenantId);
    }

    private CompletableFuture<Snapshot> refresh(UUID tenantId, Credentials credentials) {
        CompletableFuture<Snapshot> mine = new CompletableFuture<>();
        CompletableFuture<Snapshot> current = running.putIfAbsent(tenantId, mine);
        if (current != null) {
            return current;
        }
        background.execute(() -> {
            try {
                Snapshot s = load(tenantId, credentials);
                snapshots.put(tenantId, s);
                mine.complete(s);
            } catch (RuntimeException e) {
                mine.completeExceptionally(e);
            } finally {
                running.remove(tenantId, mine);
            }
        });
        return mine;
    }

    private Snapshot load(UUID tenantId, Credentials credentials) {
        AtomicLong loaded = new AtomicLong();
        long total = 0;
        progress.put(tenantId, new Progress(0, 0, true, null));
        try {
            GClickGateway.Page first = gclick.clients(credentials, 0, PAGE_SIZE);
            total = first.totalElements();
            int pageCount = Math.max(first.totalPages(), 1);
            List<List<Client>> pages = new ArrayList<>(Collections.nCopies(pageCount, List.<Client>of()));
            pages.set(0, first.content());
            loaded.addAndGet(first.content().size());
            progress.put(tenantId, new Progress(loaded.get(), total, true, null));
            long totalFinal = total;
            try (ExecutorService pool = Executors.newFixedThreadPool(CONCURRENCY, Thread.ofVirtual().factory())) {
                List<Future<?>> futures = new ArrayList<>();
                for (int p = 1; p < pageCount; p++) {
                    int page = p;
                    futures.add(pool.submit(() -> {
                        List<Client> content = gclick.clients(credentials, page, PAGE_SIZE).content();
                        synchronized (pages) {
                            pages.set(page, content);
                        }
                        progress.put(tenantId, new Progress(loaded.addAndGet(content.size()), totalFinal, true, null));
                    }));
                }
                for (Future<?> f : futures) {
                    f.get();
                }
            }
            List<Client> all = pages.stream().flatMap(List::stream).toList();
            progress.put(tenantId, new Progress(loaded.get(), total, false, null));
            return new Snapshot(all, clock.instant());
        } catch (ExecutionException e) {
            RuntimeException cause = e.getCause() instanceof RuntimeException r ? r
                    : new AppException(ErrorCode.UPSTREAM_ERROR, "Falha ao indexar o G-Click.");
            progress.put(tenantId, new Progress(loaded.get(), total, false, cause.getMessage()));
            throw cause;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.UPSTREAM_ERROR, "Indexação do G-Click interrompida.");
        } catch (RuntimeException e) {
            progress.put(tenantId, new Progress(loaded.get(), total, false, e.getMessage()));
            throw e;
        }
    }

    private static Snapshot join(CompletableFuture<Snapshot> future) {
        try {
            return future.join();
        } catch (CompletionException e) {
            throw e.getCause() instanceof RuntimeException r ? r : e;
        }
    }
}
