package br.dev.extdigisac.config;

import br.dev.extdigisac.application.HistoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

public class HistoryPurgeJob {

    private static final Logger log = LoggerFactory.getLogger(HistoryPurgeJob.class);

    private final HistoryService history;

    public HistoryPurgeJob(HistoryService history) {
        this.history = history;
    }

    @Scheduled(cron = "0 30 3 * * *", zone = "America/Sao_Paulo")
    public void run() {
        log.info("expurgo do histórico: {} linhas removidas", history.purge());
    }
}
