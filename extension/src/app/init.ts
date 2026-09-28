import { observePage } from "@/dom/observer";
import { syncTicketEntry } from "@/ui/injected/ticketMenu";
import { getAuth } from "@/storage/auth";
import { getDeptPermissions } from "@/storage/permissions";
import { getGClickEnabled } from "@/storage/gclick";
import { defaultDeptPermissions } from "@/app/permissions";
import { useAppStore } from "@/state/store";
import { logger } from "@/utils/logger";

export async function init(): Promise<void> {
  logger.info("Initializing extension");

  const auth = await getAuth();
  if (auth) {
    useAppStore.getState().setAuth({
      email: auth.email,
      name: auth.name,
      departmentNames: auth.departmentNames,
    });
  }

  const stored = await getDeptPermissions();
  const merged = { ...defaultDeptPermissions, ...stored };
  useAppStore.getState().setDeptPermissions(merged);

  const gclickEnabled = await getGClickEnabled();
  useAppStore.getState().setGclickEnabled(gclickEnabled);

  observePage(syncTicketEntry);
}
