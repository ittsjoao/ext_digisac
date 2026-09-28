import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Named, Rule } from "./api";

interface PermissionEditorProps {
  departmentName: string;
  current: Rule;
  hasRule: boolean;
  services: Named[];
  departments: Named[];
  saving: boolean;
  onSave: (rule: Rule) => void;
  onRemove: () => void;
  onCancel: () => void;
}

function toggle(list: string[], id: string, checked: boolean): string[] {
  const rest = list.filter((x) => x !== id);
  return checked ? [...rest, id] : rest;
}

export function PermissionEditor(props: PermissionEditorProps) {
  const { departmentName, current, hasRule, services, departments, saving, onSave, onRemove, onCancel } = props;
  const [allServices, setAllServices] = useState(current.allServices);
  const [serviceIds, setServiceIds] = useState<string[]>(current.serviceIds);
  const [allTargets, setAllTargets] = useState(current.allTargets);
  const [targetIds, setTargetIds] = useState<string[]>(current.targetDepartmentIds);

  function handleSave() {
    onSave({
      departmentId: current.departmentId,
      allServices,
      serviceIds: allServices ? [] : serviceIds,
      allTargets,
      targetDepartmentIds: allTargets ? [] : targetIds,
    });
  }

  return (
    <div className="space-y-4">
      <Label>
        Editando: <span className="text-primary">{departmentName}</span>
      </Label>

      <div className="space-y-2">
        <Label>Conexões</Label>
        <div className="flex items-center gap-2">
          <Checkbox id="all-services" checked={allServices} onCheckedChange={(v) => setAllServices(v === true)} />
          <Label htmlFor="all-services" className="text-sm">
            Todas
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-1 pl-4">
          {services.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <Checkbox
                id={`svc-${s.id}`}
                checked={allServices || serviceIds.includes(s.id)}
                disabled={allServices}
                onCheckedChange={(v) => setServiceIds((prev) => toggle(prev, s.id, v === true))}
              />
              <Label htmlFor={`svc-${s.id}`} className="text-xs font-normal truncate">
                {s.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Departamentos</Label>
        <div className="flex items-center gap-2">
          <Checkbox id="all-deps" checked={allTargets} onCheckedChange={(v) => setAllTargets(v === true)} />
          <Label htmlFor="all-deps" className="text-sm">
            Todos
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-1 pl-4">
          {departments.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <Checkbox
                id={`dep-${d.id}`}
                checked={allTargets || targetIds.includes(d.id)}
                disabled={allTargets}
                onCheckedChange={(v) => setTargetIds((prev) => toggle(prev, d.id, v === true))}
              />
              <Label htmlFor={`dep-${d.id}`} className="text-xs font-normal truncate">
                {d.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          Salvar
        </Button>
        {hasRule && (
          <Button size="sm" variant="destructive" onClick={onRemove} disabled={saving}>
            Remover regra
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
