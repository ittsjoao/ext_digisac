import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAppStore } from "@/state/store";
import { browser } from "wxt/browser";
import { toast } from "sonner";

export function CompanyPicker() {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const gclickEnabled = useAppStore((s) => s.gclickEnabled);
  const serviceId = useAppStore((s) => s.form.selectedServiceId);
  const clients = useAppStore((s) => s.gclickClients);
  const setClients = useAppStore((s) => s.setGclickClients);
  const selectedId = useAppStore((s) => s.form.selectedGclickClientId);
  const setFormField = useAppStore((s) => s.setFormField);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedId) ?? null,
    [clients, selectedId],
  );

  useEffect(() => {
    if (gclickEnabled && clients.length === 0) {
      loadClients("GCLICK_GET_CLIENTS");
    }
  }, [gclickEnabled]);

  async function loadClients(type: string) {
    setLoading(true);
    setProgress(null);
    try {
      let res: { ok: boolean; data?: any; error?: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await browser.runtime.sendMessage({ type });
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
      if (res?.ok) {
        const all: import("@/api/types").GClickClient[] = res.data;
        const total = all.length;
        const steps = 20;
        const stepSize = Math.ceil(total / steps);
        for (let i = stepSize; i <= total + stepSize; i += stepSize) {
          setProgress({ current: Math.min(i, total), total });
          await new Promise((r) => setTimeout(r, 30));
        }
        setClients(all);
      } else {
        toast.error(res?.error ?? "Erro ao carregar empresas G-Click");
      }
    } catch (e) {
      console.error("[CompanyPicker] sendMessage error:", e);
      toast.error("Erro ao comunicar com background");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  const availableClients = useMemo(
    () => clients.filter((c) => c.telefones.length > 0),
    [clients],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? availableClients.filter(
          (c) =>
            c.nome.toLowerCase().includes(q) || c.inscricao.includes(q),
        )
      : availableClients;

    return [...base]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, q ? undefined : 10);
  }, [availableClients, search]);

  if (!gclickEnabled || !serviceId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Empresa (G-Click)</Label>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => loadClients("GCLICK_REFRESH_CLIENTS")}
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {selectedClient ? (
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <div>
            <span>{selectedClient.nome}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {selectedClient.inscricao}
            </span>
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setFormField("selectedGclickClientId", null);
              setFormField("selectedContactId", null);
              setFormField("selectedContactName", null);
            }}
          >
            &times;
          </button>
        </div>
      ) : (
        <>
          <Input
            placeholder="Buscar empresa por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            disabled={loading}
          />
          {loading && (
            <div className="space-y-1">
              <style>{`@keyframes gclick-indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {progress ? (
                  <div
                    className="absolute h-full rounded-full bg-primary transition-all duration-75"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                ) : (
                  <div
                    className="absolute h-full w-1/3 rounded-full bg-primary"
                    style={{ animation: "gclick-indeterminate 1.4s ease-in-out infinite" }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {progress
                  ? `Carregando empresas... ${progress.current.toLocaleString("pt-BR")} / ${progress.total.toLocaleString("pt-BR")}`
                  : "Aguardando servidor..."}
              </p>
            </div>
          )}
          {!loading && focused && (
            <div
              className="h-[200px] overflow-y-auto overscroll-contain rounded-md border"
              onPointerDown={(e) => e.preventDefault()}
            >
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  onClick={() => {
                    setFormField("selectedGclickClientId", c.id);
                    setSearch("");
                  }}
                >
                  <span>{c.nome}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {c.inscricao}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  Nenhuma empresa encontrada.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
