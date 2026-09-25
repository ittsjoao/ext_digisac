// UI injetada no embed G-Click (iframe Angular): DOM puro com estilos inline, sem React.
import type { IndexProgress } from "@/storage/gclick";
import type { Departamento } from "@/utils/responsaveis";

const GREEN = "#309933";

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style = "",
  text?: string,
  ...children: Node[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.style.cssText = style;
  if (text !== undefined) el.textContent = text;
  el.append(...children);
  return el;
}

function button(label: string, onClick: () => void, primary = false) {
  const b = h(
    "button",
    `border:none;border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer;` +
      (primary ? `background:${GREEN};color:#fff;` : "background:#e8e8e8;color:#333;"),
    label,
  );
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

// ─── Overlay de indexação ─────────────────────────────────────────────

let overlay: { root: HTMLDivElement; title: HTMLElement; bar: HTMLElement; count: HTMLElement; actions: HTMLElement } | null = null;

export function showIndexing(p: IndexProgress | null) {
  if (!overlay) {
    const title = h("div", "font-size:15px;font-weight:600;margin-bottom:6px");
    const bar = h("div", `height:100%;width:0;background:${GREEN};border-radius:4px;transition:width .2s`);
    const count = h("div", "font-size:12px;color:#666;margin-top:6px");
    const actions = h("div", "display:none;gap:8px;justify-content:center;margin-top:12px");
    const box = h(
      "div",
      "background:#fff;border-radius:10px;padding:20px 24px;width:min(320px,85vw);text-align:center;box-shadow:0 4px 16px #0003;font-family:inherit",
      undefined,
      title,
      h("div", "font-size:12px;color:#666;margin-bottom:12px", "Na primeira busca as empresas são baixadas do G-Click. Os clientes deste contato aparecem assim que terminar."),
      h("div", "height:8px;background:#e8e8e8;border-radius:4px;overflow:hidden", undefined, bar),
      count,
      actions,
    );
    const root = h("div", "position:fixed;inset:0;z-index:99999;background:#f4f8fdee;display:flex;align-items:center;justify-content:center", undefined, box);
    root.setAttribute("role", "status");
    document.body.append(root);
    overlay = { root, title, bar, count, actions };
  }
  overlay.title.textContent = "Indexando empresas G-Click…";
  overlay.actions.style.display = "none";
  const pct = p && p.total > 0 ? Math.min(100, (p.loaded / p.total) * 100) : 0;
  overlay.bar.style.width = `${pct}%`;
  overlay.count.textContent =
    p && p.total > 0
      ? `${p.loaded.toLocaleString("pt-BR")} / ${p.total.toLocaleString("pt-BR")} empresas`
      : "Conectando ao G-Click…";
}

export function showIndexingError(message: string) {
  if (!overlay) return;
  overlay.title.textContent = "Falha ao indexar empresas";
  overlay.count.textContent = message;
  overlay.actions.replaceChildren(button("Tentar novamente", () => location.reload(), true), button("Fechar", hideIndexing));
  overlay.actions.style.display = "flex";
}

export function hideIndexing() {
  overlay?.root.remove();
  overlay = null;
}

// ─── Botão "Responsáveis" ─────────────────────────────────────────────

// Clona o "Criar Solicitação" para herdar classe, atributos de estilo do Angular e ícone.
// O Angular recria o bloco ao trocar de rota/cliente, então o observer reinsere.
export function mountResponsaveisButton(onClick: () => void) {
  const ensure = () => {
    const ref = document.querySelector(".nova-solicitacao-button:not([data-ext-responsaveis])");
    if (!ref || ref.parentElement?.querySelector("[data-ext-responsaveis]")) return;
    const btn = ref.cloneNode(true) as HTMLAnchorElement;
    btn.dataset.extResponsaveis = "";
    for (const n of btn.childNodes) {
      if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) n.textContent = " Responsáveis ";
    }
    btn.addEventListener("click", onClick);
    ref.after(btn);
  };
  ensure();
  new MutationObserver(ensure).observe(document.documentElement, { childList: true, subtree: true });
}

export function selectedClientName(): string {
  return document.querySelector(".cliente-filtro-wrapper .mat-mdc-select-value-text")?.textContent?.trim() ?? "";
}

// ─── Modal de responsáveis ────────────────────────────────────────────

export function openResponsaveis(clienteNome: string, load: (() => Promise<Departamento[]>) | null) {
  const body = h("div", "overflow-y:auto;max-height:65vh;padding:4px 0");
  const close = button("×", () => dialog.close());
  close.style.cssText += "padding:2px 10px;font-size:18px;line-height:1";
  close.setAttribute("aria-label", "Fechar");

  const dialog = h(
    "dialog",
    "border:none;border-radius:10px;padding:16px;width:min(420px,90vw);box-shadow:0 4px 16px #0003;font-family:inherit;color:#333",
    undefined,
    h(
      "div",
      "display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px",
      undefined,
      h("div", "font-size:15px;font-weight:600", `Responsáveis — ${clienteNome || "cliente"}`),
      close,
    ),
    body,
  );
  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
  document.body.append(dialog);
  dialog.showModal();

  const note = (text: string) => body.replaceChildren(h("p", "font-size:13px;color:#666;margin:8px 0", text));

  if (!load) {
    note("Cliente não identificado. Selecione um cliente no G-Click e tente de novo.");
    return;
  }

  const run = async () => {
    note("Carregando responsáveis…");
    try {
      const deps = await load();
      if (deps.length === 0) return note("Nenhum responsável cadastrado para este cliente.");
      body.replaceChildren(...deps.map(renderDepartamento));
    } catch (e: any) {
      note(e?.message ?? "Erro ao carregar responsáveis.");
      body.append(button("Tentar novamente", run, true));
    }
  };
  run();
}

function renderDepartamento(d: Departamento) {
  const summary = h("summary", "cursor:pointer;padding:8px 4px;font-weight:600;font-size:14px", `${d.nome} (${d.pessoas.length})`);
  const pessoas = d.pessoas.map((p) => {
    const email = h("a", `color:${GREEN};font-size:12px`, p.email);
    email.href = `mailto:${p.email}`;
    return h(
      "div",
      "padding:6px 4px 6px 16px;border-top:1px solid #f0f0f0",
      undefined,
      h("div", "font-size:13px;font-weight:500", p.nome),
      h("div", "font-size:12px;color:#666", p.cargo ? `${p.cargo} · ` : "", email),
    );
  });
  return h("details", "border-bottom:1px solid #e8e8e8", undefined, summary, ...pessoas);
}
