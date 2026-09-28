import { browser } from "wxt/browser";
import type { ExtMessage } from "@/lib/messages";
import { createSessionManager } from "@/lib/session-manager";
import type { StoredSession } from "@/lib/session-manager";

export default defineBackground(() => {
  const manager = createSessionManager({
    backendUrl: import.meta.env.WXT_BACKEND_URL,
    version: browser.runtime.getManifest().version,
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
    store: {
      get: async (host) => {
        const key = `session:${host}`;
        const result = await browser.storage.session.get(key);
        return (result[key] as StoredSession | undefined) ?? null;
      },
      set: (host, value) => browser.storage.session.set({ [`session:${host}`]: value }),
    },
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) return false;
    manager
      .handle(message as ExtMessage, sender.tab?.url)
      .then(sendResponse)
      .catch(() =>
        sendResponse({ ok: false, status: 0, code: "EXTENSION_ERROR", message: "Erro interno da extensão.", details: {} }),
      );
    return true;
  });
});
