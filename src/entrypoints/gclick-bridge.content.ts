import { logger } from "@/utils/logger";
import { getIndexProgress, watchIndexProgress } from "@/storage/gclick";
import { groupResponsaveis } from "@/utils/responsaveis";
import {
  hideIndexing,
  mountResponsaveisButton,
  openResponsaveis,
  selectedClientName,
  showIndexing,
  showIndexingError,
} from "@/ui/injected/gclickEmbed";

type EmbedClient = { id: number; nome?: string; apelido?: string };

// Ponte entre o script injetado no embed G-Click (gclick-xhr.ts) e o background.
export default defineContentScript({
  matches: ["https://g2.gclick.com.br/vertical-intro*"],
  allFrames: true,
  runAt: "document_start",
  async main() {
    let clients: EmbedClient[] = [];
    // Casamentos aguardando resposta; o overlay só aparece se há alguém esperando a indexação.
    let pending = 0;

    function onIndexing(p: Awaited<ReturnType<typeof getIndexProgress>>) {
      window.postMessage({ type: "ext-digisac:indexing" }, location.origin);
      showIndexing(p);
    }

    watchIndexProgress((p) => {
      if (pending > 0 && p.running) onIndexing(p);
    });

    window.addEventListener("message", async (e) => {
      if (e.source !== window || e.origin !== location.origin) return;

      if (e.data?.type === "ext-digisac:clients") {
        clients = Array.isArray(e.data.clients) ? e.data.clients : [];
        return;
      }
      if (e.data?.type !== "ext-digisac:match") return;

      const { id, contactId } = e.data;
      pending++;
      const progress = await getIndexProgress();
      if (progress?.running) onIndexing(progress);

      const res = await browser.runtime
        .sendMessage({ type: "GCLICK_MATCH_CONTACT", contactId })
        .catch((err: Error) => ({ ok: false, error: err.message }));
      pending--;
      if (!res?.ok) {
        logger.warn("G-Click: falha ao casar contato", contactId, res?.error);
        showIndexingError(res?.error ?? "Erro desconhecido");
      } else if (pending === 0) {
        hideIndexing();
      }

      window.postMessage(
        { type: "ext-digisac:match-result", id, clients: res?.ok ? res.data : [] },
        location.origin,
      );
    });

    mountResponsaveisButton(() => {
      const nome = selectedClientName();
      const key = nome.toLowerCase();
      // ponytail: casa pelo nome exibido no select; homônimos pegam o primeiro
      const client = clients.find((c) => [c.apelido, c.nome].some((n) => n?.trim().toLowerCase() === key));
      openResponsaveis(
        nome,
        client
          ? async () => {
              const res = await browser.runtime.sendMessage({ type: "GCLICK_GET_RESPONSAVEIS", clienteId: client.id });
              if (!res?.ok) throw new Error(res?.error ?? "Erro ao carregar responsáveis.");
              return groupResponsaveis(res.data);
            }
          : null,
      );
    });

    await injectScript("/gclick-xhr.js", { keepInDom: true });
  },
});
