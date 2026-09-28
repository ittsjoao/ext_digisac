import { ApiError, api } from "@/lib/backend";
import {
  hideIndexing,
  mountResponsaveisButton,
  openResponsaveis,
  selectedClientName,
  showIndexing,
  showIndexingError,
} from "@/features/gclick-embed/gclickEmbed";
import type { IndexProgress } from "@/features/gclick-embed/gclickEmbed";
import { logger } from "@/utils/logger";
import { groupResponsaveis } from "@/utils/responsaveis";
import type { Responsavel } from "@/utils/responsaveis";

type EmbedClient = { id: number; nome?: string; apelido?: string };

const POLL_MS = 500;

// Ponte entre o script injetado no embed G-Click (gclick-xhr.ts) e o backend (via background).
// Sem sessão ou com G-Click desligado na empresa, o casamento devolve [] e o G-Click segue nativo.
export default defineContentScript({
  matches: ["https://g2.gclick.com.br/vertical-intro*"],
  allFrames: true,
  runAt: "document_start",
  async main() {
    let clients: EmbedClient[] = [];
    // Casamentos aguardando resposta; o overlay só aparece se há alguém esperando a indexação.
    let pending = 0;
    let poller: ReturnType<typeof setInterval> | null = null;

    function stopPolling() {
      if (poller) clearInterval(poller);
      poller = null;
    }

    function startPolling() {
      if (poller) return;
      poller = setInterval(async () => {
        if (pending === 0) return stopPolling();
        try {
          const p = await api<IndexProgress>("GET", "/gclick/index-status");
          if (pending > 0 && p.running) {
            window.postMessage({ type: "ext-digisac:indexing" }, location.origin);
            showIndexing(p);
          }
        } catch {
          // sem sessão ou G-Click desligado: nada a mostrar
        }
      }, POLL_MS);
    }

    window.addEventListener("message", async (e) => {
      if (e.source !== window || e.origin !== location.origin) return;

      if (e.data?.type === "ext-digisac:clients") {
        clients = Array.isArray(e.data.clients) ? e.data.clients : [];
        return;
      }
      if (e.data?.type !== "ext-digisac:match") return;

      const { id, contactId } = e.data;
      pending++;
      startPolling();
      let matched: unknown[] = [];
      let ok = true;
      try {
        matched = (await api<unknown[]>("GET", `/gclick/match?contactId=${encodeURIComponent(String(contactId))}`)) ?? [];
      } catch (err) {
        ok = false;
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        logger.warn("G-Click: falha ao casar contato", err instanceof ApiError ? err.code : "", message);
        showIndexingError(message);
      }
      pending--;
      if (pending === 0) {
        stopPolling();
        if (ok) hideIndexing();
      }

      window.postMessage({ type: "ext-digisac:match-result", id, clients: matched }, location.origin);
    });

    mountResponsaveisButton(() => {
      const nome = selectedClientName();
      const key = nome.toLowerCase();
      // ponytail: casa pelo nome exibido no select; homônimos pegam o primeiro
      const client = clients.find((c) => [c.apelido, c.nome].some((n) => n?.trim().toLowerCase() === key));
      openResponsaveis(
        nome,
        client
          ? async () => groupResponsaveis(await api<Responsavel[]>("GET", `/gclick/clients/${client.id}/responsaveis`))
          : null,
      );
    });

    await injectScript("/gclick-xhr.js", { keepInDom: true });
  },
});
