import { useAppStore } from "@/state/store";
import {
  DIGISAC_CREATE_BUTTON_SELECTOR,
  DIGISAC_OPTIONS_BUTTON_SELECTOR,
} from "@/dom/selectors";
import { logger } from "@/utils/logger";

const EXT_BUTTON_ATTR = "data-digisac-ticket-btn";
const EXT_ITEM_ATTR = "data-digisac-ticket-item";
const EXT_MENU_ATTR = "data-digisac-ticket-menu";

const LABEL = "Abrir chamado";

// Classes copiadas do design system do DigiSac (nebula-ds). Usadas quando não
// há um elemento nativo na página de onde copiá-las.
const MENU_CLASS =
  "nebula-ds z-50 w-auto min-w-[180px] max-w-64 max-h-72 overflow-y-auto overflow-x-hidden rounded-xl border border-dropdownMenu-border bg-dropdownMenu-background text-listItem-primary-text-default shadow-md shadow-dropdownMenu-shadow p-[6px] flex flex-col gap-[1px]";
const ITEM_CLASS =
  "nebula-ds relative flex cursor-pointer select-none items-center gap-2 px-2 h-9 text-sm outline-none transition-colors duration-150 ease-out active:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 rounded-lg text-listItem-primary-text-default focus:bg-listItem-primary-background-hover focus:text-listItem-primary-text-hover active:bg-listItem-primary-background-selected active:text-listItem-primary-text-selected overflow-hidden";
const LABEL_CLASS = "nebula-ds truncate flex-1 min-w-0";

// Ícones lucide, no mesmo formato que o DigiSac renderiza.
const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON_PLUS = `<svg ${SVG_ATTRS} class="lucide lucide-plus"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>`;
const ICON_MESSAGE = `<svg ${SVG_ATTRS} class="lucide lucide-message-square-plus"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path><path d="M12 8v6"></path><path d="M9 11h6"></path></svg>`;

/**
 * Garante que a opção "Abrir chamado" esteja disponível no cabeçalho do chat.
 * Chamado a cada mutação da página, então precisa ser idempotente.
 */
export function syncTicketEntry(): void {
  const siteButton = document.querySelector(DIGISAC_CREATE_BUTTON_SELECTOR);

  if (siteButton) {
    // O "+" nativo pode surgir depois do nosso (ex.: permissões carregadas).
    removeOwnButton();
    injectIntoSiteMenu(siteButton);
    return;
  }

  if (ownMenu && !ownMenu.button.isConnected) closeOwnMenu();
  if (!document.querySelector(`[${EXT_BUTTON_ATTR}]`)) injectOwnButton();
}

function openTicketModal(): void {
  useAppStore.getState().setModalOpen(true);
}

function createMenuItem(
  itemClass: string,
  labelClass: string,
  onSelect: () => void
): HTMLElement {
  const item = document.createElement("div");
  item.setAttribute(EXT_ITEM_ATTR, "true");
  item.setAttribute("role", "menuitem");
  item.setAttribute("data-orientation", "vertical");
  item.tabIndex = -1;
  item.className = itemClass;
  item.innerHTML = ICON_MESSAGE;

  const label = document.createElement("span");
  label.className = labelClass;
  label.textContent = LABEL;
  item.appendChild(label);

  // Os itens do DigiSac são destacados via :focus ao passar o mouse.
  item.addEventListener("pointermove", () => {
    if (document.activeElement !== item) item.focus({ preventScroll: true });
  });
  item.addEventListener("pointerleave", () => {
    item.closest<HTMLElement>('[role="menu"]')?.focus({ preventScroll: true });
  });
  item.addEventListener("click", onSelect);
  item.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
  });

  return item;
}

// ---------------------------------------------------------------------------
// "+" nativo: adiciona o item ao menu Radix quando ele é aberto
// ---------------------------------------------------------------------------

function injectIntoSiteMenu(trigger: Element): void {
  if (trigger.getAttribute("aria-expanded") !== "true") return;

  const menuId = trigger.getAttribute("aria-controls");
  const menu = menuId ? document.getElementById(menuId) : null;
  if (!menu || menu.querySelector(`[${EXT_ITEM_ATTR}]`)) return;

  const template = menu.querySelector('[role="menuitem"]');
  const item = createMenuItem(
    template?.className || ITEM_CLASS,
    template?.querySelector("span")?.className || LABEL_CLASS,
    () => {
      closeSiteMenu();
      // Abrir o modal só depois que o menu do site desmontar: os dois usam
      // Radix e o menu restaura `pointer-events` do body ao sair; abrir antes
      // faria o modal "herdar" o body travado e a página ficaria sem clique.
      whenDetached(menu, () => setTimeout(openTicketModal, 0));
    }
  );

  menu.appendChild(item);
  logger.info("Ticket option added to DigiSac menu");
}

function closeSiteMenu(): void {
  // O Radix fecha a camada mais alta ao receber Escape no document.
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
}

function whenDetached(el: Element, cb: () => void, timeoutMs = 1000): void {
  const start = performance.now();
  const tick = () => {
    if (!el.isConnected || performance.now() - start > timeoutMs) cb();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Sem "+" nativo: cria um "+" igual ao do site com a única opção de chamado
// ---------------------------------------------------------------------------

interface OwnMenu {
  button: HTMLButtonElement;
  wrapper: HTMLElement;
  cleanup: () => void;
}

let ownMenu: OwnMenu | null = null;

function injectOwnButton(): void {
  const options = document.querySelector(DIGISAC_OPTIONS_BUTTON_SELECTOR);
  if (!options) return;

  const btn = document.createElement("button");
  btn.type = "button";
  // O "⋮" tem exatamente as mesmas classes do "+" nativo.
  btn.className = options.className;
  btn.setAttribute(EXT_BUTTON_ATTR, "true");
  btn.setAttribute("aria-label", LABEL);
  btn.setAttribute("aria-haspopup", "menu");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("data-state", "closed");
  btn.innerHTML = ICON_PLUS;
  btn.addEventListener("click", () => {
    if (ownMenu) closeOwnMenu();
    else openOwnMenu(btn);
  });

  options.before(btn);
  logger.info("Ticket button injected (DigiSac has no create button)");
}

function removeOwnButton(): void {
  closeOwnMenu();
  document.querySelector(`[${EXT_BUTTON_ATTR}]`)?.remove();
}

function openOwnMenu(btn: HTMLButtonElement): void {
  const rect = btn.getBoundingClientRect();

  // Mesmo esquema do Radix no DigiSac: wrapper fixo irmão do botão.
  const wrapper = document.createElement("div");
  wrapper.setAttribute(EXT_MENU_ATTR, "true");
  wrapper.style.cssText = `position: fixed; left: 0px; top: 0px; transform: translate(${rect.left}px, ${rect.bottom + 4}px); min-width: max-content; z-index: 50;`;

  const menu = document.createElement("div");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-orientation", "vertical");
  menu.setAttribute("data-state", "open");
  menu.setAttribute("data-side", "bottom");
  menu.setAttribute("data-align", "start");
  menu.tabIndex = -1;
  menu.className = MENU_CLASS;
  menu.style.cssText = "outline: none; pointer-events: auto;";

  const item = createMenuItem(ITEM_CLASS, LABEL_CLASS, () => {
    closeOwnMenu();
    openTicketModal();
  });
  menu.appendChild(item);
  menu.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      item.focus({ preventScroll: true });
    }
  });

  wrapper.appendChild(menu);
  btn.after(wrapper);

  const onPointerDown = (e: PointerEvent) => {
    const path = e.composedPath();
    if (!path.includes(wrapper) && !path.includes(btn)) closeOwnMenu();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    closeOwnMenu();
    btn.focus({ preventScroll: true });
  };
  const onViewportChange = () => closeOwnMenu();

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("scroll", onViewportChange, true);

  btn.setAttribute("aria-expanded", "true");
  btn.setAttribute("data-state", "open");

  ownMenu = {
    button: btn,
    wrapper,
    cleanup: () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    },
  };

  menu.focus({ preventScroll: true });
}

function closeOwnMenu(): void {
  if (!ownMenu) return;

  const { button, wrapper, cleanup } = ownMenu;
  ownMenu = null;
  cleanup();
  wrapper.remove();
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("data-state", "closed");
}
