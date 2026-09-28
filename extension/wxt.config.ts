import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

const DEV_BACKEND = "http://localhost:8080";

// Mesma precedência do Vite: .env < .env.local < .env.[mode] < .env.[mode].local < variável de ambiente.
function backendUrl(mode: string, command: string): string {
  const env: Record<string, string | undefined> = {};
  for (const file of [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`]) {
    if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, "utf8")));
  }
  const url = process.env.WXT_BACKEND_URL ?? env.WXT_BACKEND_URL;
  if (url && /^https?:\/\/[^/]+/.test(url)) return url;
  if (command === "serve") return DEV_BACKEND;
  throw new Error(
    `WXT_BACKEND_URL ausente ou inválida. Crie extension/.env.${mode} com WXT_BACKEND_URL=https://api.seudominio.com.br (modelo em .env.example).`,
  );
}

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: ({ mode, command }) => ({
    name: "DigiSac Ticket",
    description: "Extensão para abrir chamados no DigiSac",
    permissions: ["storage"],
    host_permissions: ["https://*.digisac.co/*", `${new URL(backendUrl(mode, command)).origin}/*`],
    web_accessible_resources: [
      { resources: ["gclick-xhr.js"], matches: ["https://g2.gclick.com.br/*"] },
      { resources: ["session-capture.js"], matches: ["https://*.digisac.co/*"] },
    ],
    browser_specific_settings: {
      gecko: {
        id: "digisac-ticket@austercontabil.com.br",
        strict_min_version: "115.0",
      },
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
