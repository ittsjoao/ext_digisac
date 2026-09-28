// Roda no contexto da página do embed G-Click (injetado por gclick-bridge.content.ts).
// Quando /plataforma-atendimento/clientes volta [] por divergência de formato do telefone,
// troca a resposta pelos clientes casados via telefone normalizado.
// Também repassa a lista final ao bridge (id do cliente para o botão "Responsáveis").
// ponytail: depende do Angular HttpXhrBackend (XHR + evento "load"); se o G-Click mudar, vira no-op.
export default defineUnlistedScript(() => {
  const TARGET = "/plataforma-atendimento/clientes";
  const TIMEOUT_MS = 5000;
  // Primeira indexação das empresas leva segundos; o bridge avisa ("indexing") e a espera estica.
  const INDEXING_TIMEOUT_MS = 3 * 60 * 1000;
  const extenders = new Set<() => void>();

  window.addEventListener("message", (e) => {
    if (e.source === window && e.data?.type === "ext-digisac:indexing") extenders.forEach((f) => f());
  });

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL) {
    const u = new URL(String(url), location.href);
    const contato = u.searchParams.get("contato");
    if (method.toUpperCase() === "GET" && u.pathname.endsWith(TARGET) && contato) {
      intercept(this, contato);
    }
    return (origOpen as any).apply(this, arguments);
  } as typeof origOpen;

  function intercept(xhr: XMLHttpRequest, contato: string) {
    const held: EventListenerOrEventListenerObject[] = [];
    const origAdd = xhr.addEventListener;

    // Segura os listeners de "load" do Angular até decidir a resposta.
    xhr.addEventListener = function (this: XMLHttpRequest, type: string, listener: any, options?: any) {
      if (type === "load" && listener) {
        held.push(listener);
        return;
      }
      return origAdd.call(this, type, listener, options);
    } as typeof origAdd;

    origAdd.call(xhr, "load", async (ev) => {
      const clients = isEmpty(xhr) ? await askMatch(contato) : [];
      if (clients.length > 0) {
        const body = JSON.stringify(clients);
        Object.defineProperty(xhr, "response", { value: body });
        Object.defineProperty(xhr, "responseText", { value: body });
      }
      publishClients(xhr);
      for (const l of held) {
        if (typeof l === "function") l.call(xhr, ev);
        else l.handleEvent(ev);
      }
    });
  }

  function isEmpty(xhr: XMLHttpRequest): boolean {
    try {
      return xhr.status === 200 && xhr.responseText.trim() === "[]";
    } catch {
      return false;
    }
  }

  function publishClients(xhr: XMLHttpRequest) {
    try {
      const clients = JSON.parse(xhr.responseText);
      if (Array.isArray(clients)) window.postMessage({ type: "ext-digisac:clients", clients }, location.origin);
    } catch {
      // resposta não-JSON: nada a repassar
    }
  }

  function askMatch(contactId: string): Promise<unknown[]> {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      let timer = setTimeout(() => done([]), TIMEOUT_MS);
      const extend = () => {
        clearTimeout(timer);
        timer = setTimeout(() => done([]), INDEXING_TIMEOUT_MS);
      };
      extenders.add(extend);

      function onMessage(e: MessageEvent) {
        if (e.source !== window || e.data?.type !== "ext-digisac:match-result" || e.data.id !== id) return;
        done(Array.isArray(e.data.clients) ? e.data.clients : []);
      }
      function done(clients: unknown[]) {
        clearTimeout(timer);
        extenders.delete(extend);
        window.removeEventListener("message", onMessage);
        resolve(clients);
      }

      window.addEventListener("message", onMessage);
      window.postMessage({ type: "ext-digisac:match", id, contactId }, location.origin);
    });
  }
});
