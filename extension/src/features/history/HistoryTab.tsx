import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { reportError, useSessionStore } from "@/stores/session";
import { fetchHistory, fetchLookup } from "./api";
import type { HistoryItem, Lookup } from "./api";

const ALL = "__all__";
const EMPTY_LOOKUP: Lookup = { services: new Map(), departments: new Map(), users: [] };

export function HistoryTab() {
  const session = useSessionStore((s) => s.state);
  const isAdmin = session?.status === "ready" && session.user.isAdmin;
  const [lookup, setLookup] = useState<Lookup>(EMPTY_LOOKUP);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLookup()
      .then(setLookup)
      .catch(() => setLookup(EMPTY_LOOKUP));
  }, []);

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const res = await fetchHistory(nextPage, userId);
        setItems((prev) => (nextPage === 0 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPage(nextPage);
      } catch (e) {
        reportError(e, "Erro ao carregar histórico");
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  const userName = (id: string) => lookup.users.find((u) => u.id === id)?.name ?? "—";

  return (
    <div className="space-y-3 py-4">
      {isAdmin && (
        <div className="space-y-2">
          <Label>Atendente</Label>
          <Select value={userId ?? ALL} onValueChange={(v) => setUserId(v === ALL ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {lookup.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <span className="text-sm text-muted-foreground">{total} registro(s)</span>
      {items.length === 0 && !loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum chamado registrado.</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
          {items.map((it, idx) => (
            <div key={it.id}>
              <div className="py-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{it.userName}</span>
                  <span>{new Date(it.createdAt).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-sm">
                  <strong>{lookup.services.get(it.serviceId) ?? "Conexão"}</strong> &rarr; {it.contactName} &rarr;{" "}
                  {lookup.departments.get(it.departmentId) ?? "Departamento"}
                </p>
                {it.assignedUserId && (
                  <p className="text-xs text-muted-foreground">Responsável: {userName(it.assignedUserId)}</p>
                )}
                {it.gclickClientName && <p className="text-xs text-muted-foreground">Empresa: {it.gclickClientName}</p>}
                {it.hadComment && <p className="text-xs italic">Com comentário</p>}
              </div>
              {idx < items.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
      {items.length < total && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => load(page + 1)} disabled={loading}>
          {loading ? "Carregando..." : "Carregar mais"}
        </Button>
      )}
    </div>
  );
}
