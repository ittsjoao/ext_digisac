import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ADMIN_EMAILS } from "@/app/config";
import { defaultDeptPermissions } from "@/app/permissions";
import type { DeptPermission, DeptPermissions } from "@/app/permissions";
import { useAppStore } from "@/state/store";
import {
  setDeptPermissions as saveDeptPermissions,
  clearDeptPermissions,
} from "@/storage/permissions";
import { ChevronDown, Download, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionEditor } from "./PermissionEditor";
import { PermissionSummaryTable } from "./PermissionSummaryTable";
import { toast } from "sonner";

export function AdminTab() {
  const services = useAppStore((s) => s.services);
  const departments = useAppStore((s) => s.departments);
  const deptPermissions = useAppStore((s) => s.deptPermissions);
  const setDeptPermissions = useAppStore((s) => s.setDeptPermissions);

  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const deptOptions = Array.from(
    new Set([
      ...Object.keys(deptPermissions),
      ...departments.map((d) => d.name),
    ]),
  ).sort();

  const currentPerm: DeptPermission | null = selectedDept
    ? (deptPermissions[selectedDept] ?? {
        allowedServiceIds: [],
        allowedDepartmentIds: [],
      })
    : null;

  function handleSave(perm: DeptPermission) {
    const updated: DeptPermissions = {
      ...deptPermissions,
      [selectedDept!]: perm,
    };
    setDeptPermissions(updated);
    saveDeptPermissions(updated);
    toast.success(`Permissões de "${selectedDept}" salvas.`);
  }

  function handleCancel() {
    setSelectedDept(null);
  }

  function handleDownloadJson() {
    const json = JSON.stringify(deptPermissions, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "department-permissions.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRestore() {
    setDeptPermissions(defaultDeptPermissions);
    await clearDeptPermissions();
    setSelectedDept(null);
    toast.success("Permissões restauradas ao padrão.");
  }

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label>Admins TI</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {ADMIN_EMAILS.map((email) => (
            <Badge key={email} variant="secondary">
              {email}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Editar Permissões</Label>
        <Select
          value={selectedDept ?? ""}
          onValueChange={(v) => setSelectedDept(v || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um departamento" />
          </SelectTrigger>
          <SelectContent>
            {deptOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedDept && currentPerm && (
          <PermissionEditor
            departmentName={selectedDept}
            current={currentPerm}
            allServices={services}
            allDepartments={departments}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80 transition-colors"
            onClick={() => setShowSummary(!showSummary)}
          >
            Resumo de Permissões
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                showSummary && "rotate-180",
              )}
            />
          </button>
          <div className="flex gap-1">
            <Button size="xs" variant="outline" onClick={handleDownloadJson}>
              <Download />
              JSON
            </Button>
            <Button size="xs" variant="outline" onClick={handleRestore}>
              <RotateCcw />
              Restaurar
            </Button>
          </div>
        </div>

        {showSummary && (
          <PermissionSummaryTable
            permissions={deptPermissions}
            allServices={services}
            allDepartments={departments}
          />
        )}
      </div>
    </div>
  );
}
