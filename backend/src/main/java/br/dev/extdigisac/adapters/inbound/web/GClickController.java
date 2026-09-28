package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.application.GClickIndex;
import br.dev.extdigisac.application.GClickService;
import br.dev.extdigisac.application.port.out.GClickGateway;
import br.dev.extdigisac.domain.Actor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GClickController {

    private final GClickService gclick;

    public GClickController(GClickService gclick) {
        this.gclick = gclick;
    }

    @GetMapping("/gclick/clients")
    List<GClickGateway.Client> search(Actor actor, @RequestParam(defaultValue = "") String q) {
        return gclick.search(actor, q);
    }

    @GetMapping("/gclick/clients/{id}/responsaveis")
    List<GClickGateway.Responsavel> responsaveis(Actor actor, @PathVariable long id) {
        return gclick.responsaveis(actor, id);
    }

    @GetMapping("/gclick/match")
    List<GClickService.Match> match(Actor actor, @RequestParam String contactId) {
        return gclick.match(actor, contactId);
    }

    @GetMapping("/gclick/index-status")
    GClickIndex.Progress status(Actor actor) {
        return gclick.progress(actor);
    }
}
