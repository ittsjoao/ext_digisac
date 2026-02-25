import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/state/store";

const NO_USER = "__none__";

export function UserSelect() {
  const usersFull = useAppStore((s) => s.usersFull);
  const departments = useAppStore((s) => s.departments);
  const selectedDepartmentId = useAppStore((s) => s.form.selectedDepartmentId);
  const selectedUserId = useAppStore((s) => s.form.selectedUserId);
  const setFormField = useAppStore((s) => s.setFormField);

  const departmentName = useMemo(() => {
    if (!selectedDepartmentId) return null;
    return departments.find((d) => d.id === selectedDepartmentId)?.name ?? null;
  }, [departments, selectedDepartmentId]);

  const filteredUsers = useMemo(() => {
    if (!departmentName) return [];
    return usersFull.filter((u) =>
      u.departments.some((d) => d.name === departmentName)
    );
  }, [usersFull, departmentName]);

  if (!selectedDepartmentId) return null;

  return (
    <div className="space-y-2">
      <Label>Usuário (opcional)</Label>
      <Select
        value={selectedUserId ?? NO_USER}
        onValueChange={(v) =>
          setFormField("selectedUserId", v === NO_USER ? null : v)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Sem responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_USER}>Sem responsável</SelectItem>
          {filteredUsers.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
