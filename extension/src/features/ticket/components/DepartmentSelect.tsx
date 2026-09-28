import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTicketStore } from "../store";
import type { Named } from "../types";

const NO_DEPARTMENTS: Named[] = [];

export function DepartmentSelect() {
  const departments = useTicketStore((s) => s.catalog?.departments ?? NO_DEPARTMENTS);
  const departmentId = useTicketStore((s) => s.form.departmentId);
  const setField = useTicketStore((s) => s.setField);

  if (departments.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Departamento</Label>
      <Select
        value={departmentId ?? ""}
        onValueChange={(v) => {
          setField("departmentId", v);
          setField("userId", null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um departamento" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
