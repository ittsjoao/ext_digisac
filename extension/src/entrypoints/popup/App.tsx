import { browser } from "wxt/browser";

export default function App() {
  const { name, version } = browser.runtime.getManifest();
  return (
    <main className="popup">
      <h1>{name}</h1>
      <p className="version">Versão {version}</p>
      <p>
        Use a extensão dentro do DigiSac: menu <strong>+</strong> → <strong>Abrir chamado</strong>.
      </p>
    </main>
  );
}
