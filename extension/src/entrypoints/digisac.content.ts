import "@/assets/main.css";
import { mountReactApp } from "@/app/mount";
import { syncTicketEntry } from "@/app/ticket-menu";
import { observePage } from "@/dom/observer";
import { sendBearer } from "@/lib/backend";
import { useSessionStore } from "@/stores/session";

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
  runAt: "document_start",
  cssInjectionMode: "ui",
  async main(ctx) {
    // A captura precisa entrar antes do DigiSac fazer as primeiras requests.
    window.addEventListener("message", onBearer);
    await injectScript("/session-capture.js", { keepInDom: true });

    if (document.readyState === "loading") {
      await new Promise<void>((resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }));
    }

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
