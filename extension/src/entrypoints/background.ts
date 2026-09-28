import { GCLICK_CLIENT_ID, GCLICK_CLIENT_SECRET } from "@/app/config";
import type { GClickClient } from "@/api/types";
import { getGClickClients, setGClickClients, setIndexProgress } from "@/storage/gclick";
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

const PAGE_SIZE = 100;
const CONCURRENCY = 6;

function mapClient(c: any): GClickClient {
  return {
    id: c.id,
    nome: c.nome ?? c.apelido ?? "",
    apelido: c.apelido ?? "",
    status: c.status ?? "",
    inscricao: c.inscricao ?? "",
    telefones: (c.telefones ?? []).map((t: any) => ({
      nome: t.nome ?? "",
      numero: t.numero ?? "",
    })),
  };
}

async function fetchPage(token: string, page: number) {
  const res = await fetch(`https://api.gclick.com.br/clientes?page=${page}&size=${PAGE_SIZE}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`G-Click fetch failed: ${res.status}`);
  return res.json() as Promise<{ content: any[]; totalElements: number; totalPages: number }>;
}

// Páginas de 100 em paralelo: ~7s para 2k clientes contra ~28s de uma requisição size=20000.
// O progresso vai para o storage (gclick_index_progress) e é lido pelo CompanyPicker e pelo embed.
async function indexClients(): Promise<GClickClient[]> {
  let loaded = 0;
  let total = 0;
  await setIndexProgress({ loaded, total, running: true });
  try {
    const token = await getToken();
    const first = await fetchPage(token, 0);
    total = first.totalElements;
    const pages: any[][] = [first.content];
    loaded = first.content.length;
    await setIndexProgress({ loaded, total, running: true });

    const queue = Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, i) => i + 1);
    const worker = async () => {
      for (let p = queue.shift(); p !== undefined; p = queue.shift()) {
        const page = await fetchPage(token, p);
        pages[p] = page.content;
        loaded += page.content.length;
        await setIndexProgress({ loaded, total, running: true });
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const clients = pages.flat().map(mapClient);
    await setGClickClients(clients);
    await setIndexProgress({ loaded, total, running: false });
    return clients;
  } catch (e: any) {
    await setIndexProgress({ loaded, total, running: false, error: e.message });
    throw e;
  }
}

// Modal e embed podem pedir ao mesmo tempo; uma indexação só.
let indexing: Promise<GClickClient[]> | null = null;
function fetchClients(): Promise<GClickClient[]> {
  return (indexing ??= indexClients().finally(() => (indexing = null)));
}

async function fetchResponsaveis(clienteId: number) {
  const token = await getToken();
  const res = await fetch(`https://api.gclick.com.br/clientes/${clienteId}/responsaveis`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`G-Click responsáveis failed: ${res.status}`);
  return res.json();
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
    found = find(await fetchClients());
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
          sendResponse({ ok: true, data: await fetchClients() });
        } catch (e: any) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }

    if (message?.type === "GCLICK_REFRESH_CLIENTS") {
      (async () => {
        try {
          sendResponse({ ok: true, data: await fetchClients() });
        } catch (e: any) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }

    if (message?.type === "GCLICK_GET_RESPONSAVEIS") {
      fetchResponsaveis(message.clienteId)
        .then((data) => sendResponse({ ok: true, data }))
        .catch((e: any) => sendResponse({ ok: false, error: e.message }));
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
