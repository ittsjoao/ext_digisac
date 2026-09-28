import { browser } from "wxt/browser";
import type { HistoryEntry } from "@/api/types";

const STORAGE_KEY_HISTORY = "digisac_history";
const MAX_ENTRIES = 20;

export async function getHistory(): Promise<HistoryEntry[]> {
  const result = await browser.storage.local.get(STORAGE_KEY_HISTORY);
  return (result[STORAGE_KEY_HISTORY] as HistoryEntry[]) ?? [];
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const current = await getHistory();
  const updated = [entry, ...current].slice(0, MAX_ENTRIES);
  await browser.storage.local.set({ [STORAGE_KEY_HISTORY]: updated });
}

export async function clearHistory(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY_HISTORY);
}
