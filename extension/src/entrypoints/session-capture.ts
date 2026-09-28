import { extractBearer } from "@/lib/bearer";

// Roda no contexto da página do DigiSac (injetado por digisac.content.ts em document_start).
// Publica o token da sessão do próprio usuário quando ele aparece (ou muda) em requests da API.
// ponytail: depende do DigiSac mandar Authorization via fetch/XHR; se mudar, a extensão fica em "aguardando sessão".
export default defineUnlistedScript(() => {
  let last = "";

  function publish(authorization: string | null | undefined, url: string) {
    const bearer = extractBearer(authorization, url, location.origin);
    if (!bearer || bearer === last) return;
    last = bearer;
    window.postMessage({ type: "ext-digisac:bearer", bearer }, location.origin);
  }

  const urls = new WeakMap<XMLHttpRequest, string>();
  const origOpen = XMLHttpRequest.prototype.open;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, _method: string, url: string | URL) {
    urls.set(this, String(url));
    return (origOpen as (...args: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
  } as typeof origOpen;

  XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    try {
      if (name.toLowerCase() === "authorization") publish(value, urls.get(this) ?? "");
    } catch {
      // nunca quebra a página
    }
    return origSetHeader.call(this, name, value);
  };

  const origFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      publish(headers.get("authorization"), url);
    } catch {
      // nunca quebra a página
    }
    return origFetch(input, init);
  } as typeof fetch;
});
