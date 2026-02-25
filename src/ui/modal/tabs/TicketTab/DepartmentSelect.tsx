import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/state/store";
import { getAllowedDepartments } from "@/app/permissions";

export function DepartmentSelect() {
  const departments = useAppStore((s) => s.departments);
  const email = useAppStore((s) => s.auth.email);
  const userDepts = useAppStore((s) => s.auth.departmentNames);
  const selectedDepartmentId = useAppStore((s) => s.form.selectedDepartmentId);
  const setFormField = useAppStore((s) => s.setFormField);
  const deptPermissions = useAppStore((s) => s.deptPermissions);

  const allowed = email
    ? getAllowedDepartments(email, userDepts, departments, deptPermissions)
    : [];

  if (allowed.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Departamento</Label>
      <Select
        value={selectedDepartmentId ?? ""}
        onValueChange={(v) => {
          setFormField("selectedDepartmentId", v);
          setFormField("selectedUserId", null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um departamento" />
        </SelectTrigger>
        <SelectContent>
          {allowed.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
