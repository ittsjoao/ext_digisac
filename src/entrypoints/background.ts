import { GCLICK_CLIENT_ID, GCLICK_CLIENT_SECRET } from "@/app/config";
import type { GClickClient } from "@/api/types";
import { getGClickClients, setGClickClients } from "@/storage/gclick";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: GCLICK_CLIENT_ID,
    client_secret: GCLICK_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch("https://api.gclick.com.br/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(`G-Click OAuth failed: ${res.status}`);

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return tokenCache.accessToken;
}

async function fetchClients(): Promise<GClickClient[]> {
  const token = await getToken();

  const res = await fetch("https://api.gclick.com.br/clientes?size=20000", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`G-Click fetch failed: ${res.status}`);

  const json = await res.json();
  const raw = json.content ?? json;

  return raw.map((c: any) => ({
    id: c.id,
    nome: c.nome ?? c.apelido ?? "",
    inscricao: c.inscricao ?? "",
    telefones: (c.telefones ?? []).map((t: any) => ({
      nome: t.nome ?? "",
      numero: t.numero ?? "",
    })),
  }));
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GCLICK_GET_CLIENTS") {
      (async () => {
        try {
          const cached = await getGClickClients();
          if (cached) {
            sendResponse({ ok: true, data: cached });
            return;
          }
          const clients = await fetchClients();
          await setGClickClients(clients);
          sendResponse({ ok: true, data: clients });
        } catch (e: any) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }

    if (message?.type === "GCLICK_REFRESH_CLIENTS") {
      (async () => {
        try {
          const clients = await fetchClients();
          await setGClickClients(clients);
          sendResponse({ ok: true, data: clients });
        } catch (e: any) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }
  });
});
