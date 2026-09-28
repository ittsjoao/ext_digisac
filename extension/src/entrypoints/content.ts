import { init } from "@/app/init";
import { mountReactApp } from "@/ui/mount";
import "@/assets/main.css";

export default defineContentScript({
  matches: ["*://auster.digisac.co/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "digisac-ticket",
      position: "inline",
      onMount(container, shadow) {
        mountReactApp(container, shadow);
      },
      onRemove() {
        // cleanup handled by mountReactApp's unmount
      },
    });

    ui.mount();
    await init();
  },
});
