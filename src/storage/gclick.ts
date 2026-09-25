import { browser } from "wxt/browser";
import type { GClickClient } from "@/api/types";

const KEY_ENABLED = "gclick_enabled";
const KEY_CLIENTS = "gclick_clients";

export async function getGClickEnabled(): Promise<boolean> {
  const result = await browser.storage.local.get(KEY_ENABLED);
  return (result[KEY_ENABLED] as boolean) ?? false;
}

export async function setGClickEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [KEY_ENABLED]: enabled });
}

export async function getGClickClients(): Promise<GClickClient[] | null> {
  const result = await browser.storage.local.get(KEY_CLIENTS);
  return (result[KEY_CLIENTS] as GClickClient[]) ?? null;
}

export async function setGClickClients(
  clients: GClickClient[],
): Promise<void> {
  await browser.storage.local.set({ [KEY_CLIENTS]: clients });
}

const KEY_PROGRESS = "gclick_index_progress";

export interface IndexProgress {
  loaded: number;
  total: number;
  running: boolean;
  error?: string;
}

export async function getIndexProgress(): Promise<IndexProgress | null> {
  const result = await browser.storage.local.get(KEY_PROGRESS);
  return (result[KEY_PROGRESS] as IndexProgress) ?? null;
}

export async function setIndexProgress(progress: IndexProgress): Promise<void> {
  await browser.storage.local.set({ [KEY_PROGRESS]: progress });
}

// Progresso da indexação publicado pelo background; qualquer contexto da extensão pode ouvir.
export function watchIndexProgress(cb: (p: IndexProgress) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    const p = changes[KEY_PROGRESS]?.newValue;
    if (area === "local" && p) cb(p as IndexProgress);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
