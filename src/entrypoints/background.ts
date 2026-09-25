import { GCLICK_CLIENT_ID, GCLICK_CLIENT_SECRET } from "@/app/config";
import type { GClickClient } from "@/api/types";
import { getGClickClients, setGClickClients } from "@/storage/gclick";
import { request } from "@/api/client";
import { phoneKey } from "@/utils/phone";

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
    apelido: c.apelido ?? "",
    status: c.status ?? "",
    inscricao: c.inscricao ?? "",
    telefones: (c.telefones ?? []).map((t: any) => ({
      nome: t.nome ?? "",
      numero: t.numero ?? "",
    })),
  }));
}

const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
let lastRefreshAt = 0;

// Casa o contato Digisac com clientes G-Click pelo telefone normalizado.
// Retorna no formato de /plataforma-atendimento/clientes do g2api.
async function matchContact(contactId: string) {
  const contact = await request<{ data?: { number?: string } }>(`contacts/${contactId}`);
  const key = phoneKey(contact.data?.number ?? "");
  if (key.length < 8) return [];

  const find = (clients: GClickClient[]) =>
    clients.filter((c) => c.telefones.some((t) => phoneKey(t.numero) === key));

  let found = find((await getGClickClients()) ?? []);
  // ponytail: cliente novo no G-Click só aparece após refresh; cooldown evita baixar 20k clientes a cada miss
  if (found.length === 0 && Date.now() - lastRefreshAt > REFRESH_COOLDOWN_MS) {
    lastRefreshAt = Date.now();
    const clients = await fetchClients();
    await setGClickClients(clients);
    found = find(clients);
  }

  return found.map((c) => ({
    id: c.id,
    apelido: c.apelido || c.nome,
    nome: c.nome,
    status: c.status || "ATIVO",
    possuiAcesso: true,
    integra: "",
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

    if (message?.type === "GCLICK_MATCH_CONTACT") {
      matchContact(message.contactId)
        .then((data) => sendResponse({ ok: true, data }))
        .catch((e: any) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
  });
});
