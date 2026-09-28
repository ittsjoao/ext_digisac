import { sendBearer } from "@/lib/backend";

// Separado do digisac.content.ts: precisa rodar em document_start, antes das primeiras requests
// do DigiSac, e não pode importar a UI (o sonner injeta CSS em document.head no import, que
// ainda não existe nesse momento).
export default defineContentScript({
  matches: ["https://*.digisac.co/*"],
  runAt: "document_start",
  async main() {
    window.addEventListener("message", (e: MessageEvent) => {
      if (e.source !== window || e.origin !== location.origin) return;
      if (e.data?.type !== "ext-digisac:bearer" || typeof e.data.bearer !== "string") return;
      sendBearer(e.data.bearer).catch(() => {});
    });
    await injectScript("/session-capture.js", { keepInDom: true });
  },
});
