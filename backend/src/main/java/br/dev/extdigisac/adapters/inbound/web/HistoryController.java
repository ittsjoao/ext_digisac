package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.HistoryService;
import br.dev.extdigisac.application.port.out.HistoryRepository;
import br.dev.extdigisac.domain.Actor;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HistoryController {

    private final HistoryService history;

    public HistoryController(HistoryService history) {
        this.history = history;
    }

    @GetMapping("/history")
    HistoryRepository.Page list(Actor actor,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String departmentId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return history.list(actor, new HistoryService.Filter(userId, departmentId, from, to, page, size));
    }
}
