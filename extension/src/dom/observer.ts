import { logger } from "@/utils/logger";

export function observePage(onChange: () => void): void {
  onChange();

  const observer = new MutationObserver(() => onChange());
  observer.observe(document.body, { childList: true, subtree: true });

  logger.info("Page observer started");
}
