import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { ShadowRootContext } from "@/components/shadow-root";
import { MainModal } from "./MainModal";

let root: Root | null = null;

export function mountReactApp(container: HTMLElement, shadow: ShadowRoot): void {
  if (root) return;

  // Contêiner dedicado aos portais (select, tooltip) dentro do shadow root.
  const portalContainer = document.createElement("div");
  portalContainer.id = "digisac-portal-root";
  shadow.appendChild(portalContainer);

  root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ShadowRootContext.Provider value={portalContainer}>
        <MainModal />
      </ShadowRootContext.Provider>
    </React.StrictMode>,
  );
}
