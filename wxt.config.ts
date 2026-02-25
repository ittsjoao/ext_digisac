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
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
