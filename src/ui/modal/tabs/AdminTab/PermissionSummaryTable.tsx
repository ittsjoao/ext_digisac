import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeptPermissions } from "@/app/permissions";
import type { ServiceItem, DepartmentItem } from "@/api/types";

interface PermissionSummaryTableProps {
  permissions: DeptPermissions;
  allServices: ServiceItem[];
  allDepartments: DepartmentItem[];
}

function resolveNames(ids: string[], items: { id: string; name: string }[]) {
  if (ids.includes("*")) return "Todos";
  const map = new Map(items.map((i) => [i.id, i.name]));
  const resolved = ids.map((id) => map.get(id) ?? id);
  return resolved.length > 0 ? resolved.join(", ") : "Nenhum";
}

export function PermissionSummaryTable({
  permissions,
  allServices,
  allDepartments,
}: PermissionSummaryTableProps) {
  const entries = Object.entries(permissions);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma permissão configurada.
      </p>
    );
  }

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
        {entries.map(([deptName, perms]) => (
          <TableRow key={deptName}>
            <TableCell className="font-medium text-xs align-top">
              {deptName}
            </TableCell>
            <TableCell className="text-xs whitespace-normal align-top">
              {resolveNames(perms.allowedServiceIds, allServices)}
            </TableCell>
            <TableCell className="text-xs whitespace-normal align-top">
              {resolveNames(perms.allowedDepartmentIds, allDepartments)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
