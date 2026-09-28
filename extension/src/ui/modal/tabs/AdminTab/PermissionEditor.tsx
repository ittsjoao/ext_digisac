import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DeptPermission } from "@/app/permissions";
import type { ServiceItem, DepartmentItem } from "@/api/types";

interface PermissionEditorProps {
  departmentName: string;
  current: DeptPermission;
  allServices: ServiceItem[];
  allDepartments: DepartmentItem[];
  onSave: (perm: DeptPermission) => void;
  onCancel: () => void;
}

export function PermissionEditor({
  departmentName,
  current,
  allServices,
  allDepartments,
  onSave,
  onCancel,
}: PermissionEditorProps) {
  const [serviceIds, setServiceIds] = useState<string[]>(
    current.allowedServiceIds
  );
  const [departmentIds, setDepartmentIds] = useState<string[]>(
    current.allowedDepartmentIds
  );

  useEffect(() => {
    setServiceIds(current.allowedServiceIds);
    setDepartmentIds(current.allowedDepartmentIds);
  }, [current, departmentName]);

  const allServicesChecked = serviceIds.includes("*");
  const allDepsChecked = departmentIds.includes("*");

  function toggleAllServices(checked: boolean) {
    setServiceIds(checked ? ["*"] : []);
  }

  function toggleService(id: string, checked: boolean) {
    setServiceIds((prev) => {
      const filtered = prev.filter((x) => x !== "*");
      return checked ? [...filtered, id] : filtered.filter((x) => x !== id);
    });
  }

  function toggleAllDepartments(checked: boolean) {
    setDepartmentIds(checked ? ["*"] : []);
  }

  function toggleDepartment(id: string, checked: boolean) {
    setDepartmentIds((prev) => {
      const filtered = prev.filter((x) => x !== "*");
      return checked ? [...filtered, id] : filtered.filter((x) => x !== id);
    });
  }

  function handleSave() {
    onSave({
      allowedServiceIds: serviceIds,
      allowedDepartmentIds: departmentIds,
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
          <Checkbox
            id="all-services"
            checked={allServicesChecked}
            onCheckedChange={(v) => toggleAllServices(v === true)}
          />
          <Label htmlFor="all-services" className="text-sm">
            Todas
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-1 pl-4">
          {allServices.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <Checkbox
                id={`svc-${s.id}`}
                checked={allServicesChecked || serviceIds.includes(s.id)}
                disabled={allServicesChecked}
                onCheckedChange={(v) => toggleService(s.id, v === true)}
              />
              <Label
                htmlFor={`svc-${s.id}`}
                className="text-xs font-normal truncate"
              >
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
          <Checkbox
            id="all-deps"
            checked={allDepsChecked}
            onCheckedChange={(v) => toggleAllDepartments(v === true)}
          />
          <Label htmlFor="all-deps" className="text-sm">
            Todos
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-1 pl-4">
          {allDepartments.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <Checkbox
                id={`dep-${d.id}`}
                checked={allDepsChecked || departmentIds.includes(d.id)}
                disabled={allDepsChecked}
                onCheckedChange={(v) => toggleDepartment(d.id, v === true)}
              />
              <Label
                htmlFor={`dep-${d.id}`}
                className="text-xs font-normal truncate"
              >
                {d.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave}>
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
