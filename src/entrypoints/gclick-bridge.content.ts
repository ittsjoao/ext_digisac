import { logger } from "@/utils/logger";

// Ponte entre o script injetado no embed G-Click (gclick-xhr.ts) e o background.
export default defineContentScript({
  matches: ["https://g2.gclick.com.br/vertical-intro*"],
  allFrames: true,
  runAt: "document_start",
  async main() {
    window.addEventListener("message", async (e) => {
      if (e.source !== window || e.origin !== location.origin || e.data?.type !== "ext-digisac:match") return;

      const { id, contactId } = e.data;
      const res = await browser.runtime
        .sendMessage({ type: "GCLICK_MATCH_CONTACT", contactId })
        .catch((err: Error) => ({ ok: false, error: err.message }));
      if (!res?.ok) logger.warn("G-Click: falha ao casar contato", contactId, res?.error);

      window.postMessage(
        { type: "ext-digisac:match-result", id, clients: res?.ok ? res.data : [] },
        location.origin,
      );
    });

    await injectScript("/gclick-xhr.js", { keepInDom: true });
  },
});
