import { createContext, useContext } from "react";

export const ShadowRootContext = createContext<HTMLElement | null>(null);

export function useShadowRoot(): HTMLElement | null {
  return useContext(ShadowRootContext);
}
