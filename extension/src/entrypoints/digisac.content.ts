import "@/assets/main.css";
import { mountReactApp } from "@/app/mount";
import { syncTicketEntry } from "@/app/ticket-menu";
import { observePage } from "@/dom/observer";
import { sendBearer } from "@/lib/backend";
import { useSessionStore } from "@/stores/session";

// A captura e o envio inicial do bearer ficam em digisac-session.content.ts (document_start).
// Aqui só reagimos a um bearer novo: o reenvio é idempotente e garante a ordem antes do refresh.
function onBearer(e: MessageEvent) {
  if (e.source !== window || e.origin !== location.origin) return;
  if (e.data?.type !== "ext-digisac:bearer" || typeof e.data.bearer !== "string") return;
  sendBearer(e.data.bearer)
    .then(() => {
      // Modal já usado (ou aguardando): pede o estado de novo com a sessão nova.
      if (useSessionStore.getState().state !== null) void useSessionStore.getState().refresh();
    })
    .catch(() => {});
}

export default defineContentScript({
  matches: ["https://*.digisac.co/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    window.addEventListener("message", onBearer);

    const ui = await createShadowRootUi(ctx, {
      name: "digisac-ticket",
      position: "inline",
      onMount(container, shadow) {
        mountReactApp(container, shadow);
      },
    });
    ui.mount();
    observePage(syncTicketEntry);
  },
});
