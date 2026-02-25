import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/state/store";
import { getAllowedServices } from "@/app/permissions";
import { listContactsByService } from "@/api/contacts";
import { toast } from "sonner";

export function ServiceSelect() {
  const services = useAppStore((s) => s.services);
  const email = useAppStore((s) => s.auth.email);
  const userDepts = useAppStore((s) => s.auth.departmentNames);
  const selectedServiceId = useAppStore((s) => s.form.selectedServiceId);
  const setFormField = useAppStore((s) => s.setFormField);
  const setContactsForService = useAppStore((s) => s.setContactsForService);
  const contactsByService = useAppStore((s) => s.contactsByService);
  const deptPermissions = useAppStore((s) => s.deptPermissions);

  const allowed = email
    ? getAllowedServices(email, userDepts, services, deptPermissions)
    : [];

  const handleChange = async (serviceId: string) => {
    setFormField("selectedServiceId", serviceId);
    setFormField("selectedContactId", null);
    setFormField("selectedContactName", null);

    if (!contactsByService[serviceId]) {
      try {
        const contacts = await listContactsByService(serviceId);
        setContactsForService(serviceId, contacts);
      } catch {
        toast.error("Erro ao carregar contatos");
      }
    }
  };

  if (allowed.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Conexão</Label>
      <Select value={selectedServiceId ?? ""} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma conexão" />
        </SelectTrigger>
        <SelectContent>
          {allowed.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
