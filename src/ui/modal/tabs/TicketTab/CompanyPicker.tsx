import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { useAppStore } from "@/state/store";
import { browser } from "wxt/browser";
import { toast } from "sonner";

export function CompanyPicker() {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
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
    try {
      const res = await browser.runtime.sendMessage({ type });
      if (res?.ok) {
        setClients(res.data);
      } else {
        toast.error(res?.error ?? "Erro ao carregar empresas G-Click");
      }
    } catch {
      toast.error("Erro ao comunicar com background");
    } finally {
      setLoading(false);
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
            onClick={() => setFormField("selectedGclickClientId", null)}
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
            <p className="text-xs text-muted-foreground">
              Carregando empresas...
            </p>
          )}
          {!loading && focused && (
            <ScrollArea className="h-[200px] rounded-md border">
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
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
