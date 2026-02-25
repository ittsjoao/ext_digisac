import { init } from "@/app/init";
import "@/assets/main.css";

export default defineContentScript({
  matches: ["*://auster.digisac.co/*"],
  async main() {
    init();
  },
});
