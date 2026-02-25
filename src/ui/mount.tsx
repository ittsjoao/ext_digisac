import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { MainModal } from "./modal/MainModal";

let root: Root | null = null;

export function mountReactApp(): void {
  if (root) return;

  const container = document.createElement("div");
  container.id = "digisac-ticket-root";
  document.body.appendChild(container);

  root = createRoot(container);
  root.render(
    <React.StrictMode>
      <MainModal />
    </React.StrictMode>
  );
}
