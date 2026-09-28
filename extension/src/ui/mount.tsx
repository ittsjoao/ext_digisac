import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { MainModal } from "./modal/MainModal";
import { ShadowRootContext } from "./ShadowRootContext";

let root: Root | null = null;

export function mountReactApp(
  container: HTMLElement,
  shadow: ShadowRoot
): void {
  if (root) return;

  // Create a dedicated wrapper for portal content inside the shadow root
  const portalContainer = document.createElement("div");
  portalContainer.id = "digisac-portal-root";
  shadow.appendChild(portalContainer);

  root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ShadowRootContext.Provider value={portalContainer}>
        <MainModal />
      </ShadowRootContext.Provider>
    </React.StrictMode>
  );
}
