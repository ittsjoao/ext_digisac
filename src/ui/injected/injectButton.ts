import { mountReactApp } from "@/ui/mount";
import { useAppStore } from "@/state/store";

export function injectButton(header: Element): void {
  if (header.querySelector("[data-digisac-ticket-btn]")) return;

  const btn = document.createElement("button");
  btn.setAttribute("data-digisac-ticket-btn", "true");
  btn.textContent = "Abrir Chamado";
  btn.style.cssText = `
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    margin-left: 8px;
  `;

  btn.addEventListener("click", () => {
    mountReactApp();
    useAppStore.getState().setModalOpen(true);
  });

  header.appendChild(btn);
}
