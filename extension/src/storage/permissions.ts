import { browser } from "wxt/browser";
import type { DeptPermissions } from "@/app/permissions";

const STORAGE_KEY = "digisac_dept_permissions";

export async function getDeptPermissions(): Promise<DeptPermissions | null> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as DeptPermissions) ?? null;
}

export async function setDeptPermissions(
  data: DeptPermissions
): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: data });
}

export async function clearDeptPermissions(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}
