import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTicketStore } from "../store";
import type { CatalogUser } from "../types";

const NO_USERS: CatalogUser[] = [];
const NO_USER = "__none__";

export function UserSelect() {
  const users = useTicketStore((s) => s.catalog?.users ?? NO_USERS);
  const departmentId = useTicketStore((s) => s.form.departmentId);
  const userId = useTicketStore((s) => s.form.userId);
  const setField = useTicketStore((s) => s.setField);

  const filtered = useMemo(
    () => (departmentId ? users.filter((u) => u.departments.some((d) => d.id === departmentId)) : NO_USERS),
    [users, departmentId],
  );

  if (!departmentId) return null;

  return (
    <div className="space-y-2">
      <Label>Usuário (opcional)</Label>
      <Select value={userId ?? NO_USER} onValueChange={(v) => setField("userId", v === NO_USER ? null : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Sem responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_USER}>Sem responsável</SelectItem>
          {filtered.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
