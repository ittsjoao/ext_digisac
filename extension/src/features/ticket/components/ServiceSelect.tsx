import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportError } from "@/stores/session";
import { fetchContacts } from "../api";
import { useTicketStore } from "../store";
import type { Named } from "../types";

const NO_SERVICES: Named[] = [];

export function ServiceSelect() {
  const services = useTicketStore((s) => s.catalog?.services ?? NO_SERVICES);
  const serviceId = useTicketStore((s) => s.form.serviceId);
  const contactsByService = useTicketStore((s) => s.contactsByService);
  const setField = useTicketStore((s) => s.setField);
  const setContacts = useTicketStore((s) => s.setContacts);
  const clearContact = useTicketStore((s) => s.clearContact);

  async function handleChange(id: string) {
    setField("serviceId", id);
    clearContact();
    if (contactsByService[id]) return;
    try {
      setContacts(id, await fetchContacts(id));
    } catch (e) {
      reportError(e, "Erro ao carregar contatos");
    }
  }

  if (services.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma conexão liberada para o seu departamento.</p>;
  }

  return (
    <div className="space-y-2">
      <Label>Conexão</Label>
      <Select value={serviceId ?? ""} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma conexão" />
        </SelectTrigger>
        <SelectContent>
          {services.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
