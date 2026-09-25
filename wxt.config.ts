import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "DigiSac Ticket",
    description: "Extensão para abrir chamados no DigiSac",
    permissions: ["storage"],
    host_permissions: ["https://auster.digisac.co/*", "https://api.gclick.com.br/*"],
    web_accessible_resources: [
      { resources: ["gclick-xhr.js"], matches: ["https://g2.gclick.com.br/*"] },
    ],
    browser_specific_settings: {
      gecko: {
        id: "digisac-ticket@austercontabil.com.br",
        strict_min_version: "109.0",
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
