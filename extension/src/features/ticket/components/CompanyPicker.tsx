import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportError, useSessionStore } from "@/stores/session";
import { fetchIndexStatus, searchCompanies } from "../api";
import { useTicketStore } from "../store";
import type { GClickClient, IndexProgress } from "../types";

const DEBOUNCE_MS = 300;
const POLL_MS = 500;

export function CompanyPicker() {
  const session = useSessionStore((s) => s.state);
  const gclickEnabled = session?.status === "ready" && session.tenant.gclickEnabled;
  const serviceId = useTicketStore((s) => s.form.serviceId);
  const company = useTicketStore((s) => s.form.company);
  const setField = useTicketStore((s) => s.setField);
  const clearContact = useTicketStore((s) => s.clearContact);

  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<GClickClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<IndexProgress | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = search.trim();
    const id = ++seq.current;
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setProgress(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      // A primeira busca espera a indexação do G-Click no servidor; o progresso vem do index-status.
      const poll = setInterval(() => {
        fetchIndexStatus()
          .then((p) => {
            if (seq.current === id && p.running) setProgress(p);
          })
          .catch(() => {});
      }, POLL_MS);
      try {
        const found = await searchCompanies(term);
        if (seq.current === id) setResults(found);
      } catch (e) {
        if (seq.current === id) reportError(e, "Erro ao buscar empresas G-Click");
      } finally {
        clearInterval(poll);
        if (seq.current === id) {
          setLoading(false);
          setProgress(null);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  if (!gclickEnabled || !serviceId) return null;

  function select(c: GClickClient) {
    setField("company", c);
    clearContact();
    setSearch("");
  }

  return (
    <div className="space-y-2">
      <Label>Empresa (G-Click)</Label>
      {company ? (
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <div>
            <span>{company.nome}</span>
            <span className="text-xs text-muted-foreground ml-2">{company.inscricao}</span>
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setField("company", null);
              clearContact();
            }}
          >
            &times;
          </button>
        </div>
      ) : (
        <>
          <Input
            placeholder="Buscar empresa por nome, CNPJ ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
          {loading && (
            <div className="space-y-1">
              <style>{`@keyframes gclick-indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {progress && progress.total > 0 ? (
                  <div
                    className="absolute h-full rounded-full bg-primary transition-all duration-75"
                    style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                  />
                ) : (
                  <div
                    className="absolute h-full w-1/3 rounded-full bg-primary"
                    style={{ animation: "gclick-indeterminate 1.4s ease-in-out infinite" }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {progress && progress.total > 0
                  ? `Carregando empresas... ${progress.loaded.toLocaleString("pt-BR")} / ${progress.total.toLocaleString("pt-BR")}`
                  : "Buscando..."}
              </p>
            </div>
          )}
          {!loading && focused && (
            <div
              className="h-[200px] overflow-y-auto overscroll-contain rounded-md border"
              onPointerDown={(e) => e.preventDefault()}
            >
              {search.trim().length < 2 ? (
                <p className="p-3 text-sm text-muted-foreground">Digite ao menos 2 letras.</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                    onClick={() => select(c)}
                  >
                    <span>{c.nome}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.inscricao}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
