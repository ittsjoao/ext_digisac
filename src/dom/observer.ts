import { DIGISAC_HEADER_SELECTOR } from "./selectors";
import { logger } from "@/utils/logger";

export function observeHeader(onHeaderFound: (header: Element) => void): void {
  const check = () => {
    const header = document.querySelector(DIGISAC_HEADER_SELECTOR);
    if (header && !header.querySelector("[data-digisac-ticket-btn]")) {
      onHeaderFound(header);
    }
  };

  check();

  const observer = new MutationObserver(() => check());
  observer.observe(document.body, { childList: true, subtree: true });

  logger.info("Header observer started");
}
