import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Named, Rule } from "./api";

interface PermissionSummaryTableProps {
  rules: Rule[];
  services: Named[];
  departments: Named[];
}

function names(all: boolean, ids: string[], items: Named[], allLabel: string): string {
  if (all) return allLabel;
  const map = new Map(items.map((i) => [i.id, i.name]));
  const resolved = ids.map((id) => map.get(id) ?? id);
  return resolved.length > 0 ? resolved.join(", ") : "Nenhum";
}

export function PermissionSummaryTable({ rules, services, departments }: PermissionSummaryTableProps) {
  if (rules.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma permissão configurada.</p>;
  }
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const sorted = [...rules].sort((a, b) =>
    (deptName.get(a.departmentId) ?? a.departmentId).localeCompare(deptName.get(b.departmentId) ?? b.departmentId),
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[140px]">Departamento</TableHead>
          <TableHead>Conexões</TableHead>
          <TableHead>Departamentos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.departmentId}>
            <TableCell className="font-medium text-xs align-top">{deptName.get(r.departmentId) ?? r.departmentId}</TableCell>
            <TableCell className="text-xs whitespace-normal align-top">
              {names(r.allServices, r.serviceIds, services, "Todas")}
            </TableCell>
            <TableCell className="text-xs whitespace-normal align-top">
              {names(r.allTargets, r.targetDepartmentIds, departments, "Todos")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
