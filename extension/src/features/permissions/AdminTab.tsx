import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { reportError } from "@/stores/session";
import { deleteRule, fetchPermissions, saveRule } from "./api";
import type { PermissionsView, Rule } from "./api";
import { PermissionEditor } from "./PermissionEditor";
import { PermissionSummaryTable } from "./PermissionSummaryTable";

function emptyRule(departmentId: string): Rule {
  return { departmentId, allServices: false, serviceIds: [], allTargets: false, targetDepartmentIds: [] };
}

export function AdminTab() {
  const [view, setView] = useState<PermissionsView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPermissions()
      .then(setView)
      .catch((e) => reportError(e, "Erro ao carregar permissões"));
  }, []);

  const rules = useMemo(() => new Map((view?.rules ?? []).map((r) => [r.departmentId, r])), [view]);
  const departments = useMemo(
    () => [...(view?.departments ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [view],
  );

  if (!view) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;

  const selectedName = departments.find((d) => d.id === selected)?.name ?? "";
  const current = selected ? (rules.get(selected) ?? emptyRule(selected)) : null;

  async function handleSave(rule: Rule) {
    setSaving(true);
    try {
      const saved = await saveRule(rule);
      setView((v) => v && { ...v, rules: [...v.rules.filter((r) => r.departmentId !== saved.departmentId), saved] });
      toast.success(`Permissões de "${selectedName}" salvas.`);
    } catch (e) {
      reportError(e, "Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(departmentId: string) {
    setSaving(true);
    try {
      await deleteRule(departmentId);
      setView((v) => v && { ...v, rules: v.rules.filter((r) => r.departmentId !== departmentId) });
      toast.success(`Regra de "${selectedName}" removida.`);
    } catch (e) {
      reportError(e, "Erro ao remover regra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-3">
        <Label>Editar permissões</Label>
        <Select value={selected ?? ""} onValueChange={(v) => setSelected(v || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um departamento" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
                {rules.has(d.id) ? "" : " (sem regra)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && current && (
          <PermissionEditor
            key={selected}
            departmentName={selectedName}
            current={current}
            hasRule={rules.has(selected)}
            services={view.services}
            departments={departments}
            saving={saving}
            onSave={handleSave}
            onRemove={() => handleRemove(selected)}
            onCancel={() => setSelected(null)}
          />
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80 transition-colors"
          onClick={() => setShowSummary(!showSummary)}
        >
          Resumo de permissões
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showSummary && "rotate-180")} />
        </button>
        {showSummary && <PermissionSummaryTable rules={view.rules} services={view.services} departments={departments} />}
      </div>
    </div>
  );
}
