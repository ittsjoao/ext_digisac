import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/state/store";
import { checkOpenTicket } from "@/api/tickets";
import { toast } from "sonner";

export function ContactPicker() {
  const [search, setSearch] = useState("");
  const [checking, setChecking] = useState(false);
  const serviceId = useAppStore((s) => s.form.selectedServiceId);
  const contactsByService = useAppStore((s) => s.contactsByService);
  const selectedContactId = useAppStore((s) => s.form.selectedContactId);
  const selectedContactName = useAppStore((s) => s.form.selectedContactName);
  const setFormField = useAppStore((s) => s.setFormField);

  const contacts = serviceId ? contactsByService[serviceId] ?? [] : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return contacts.filter((c) => {
      const displayName = c.internalName ?? c.name;
      const number = c.data?.number ?? "";
      return (
        displayName.toLowerCase().includes(q) ||
        number.toLowerCase().includes(q)
      );
    });
  }, [contacts, search]);

  const handleSelect = async (contactId: string, displayName: string) => {
    setChecking(true);
    try {
      const hasOpen = await checkOpenTicket(contactId);
      if (hasOpen) {
        toast.error("Este contato já possui um ticket aberto.");
        return;
      }
      setFormField("selectedContactId", contactId);
      setFormField("selectedContactName", displayName);
      setSearch("");
    } catch {
      toast.error("Erro ao verificar tickets abertos");
    } finally {
      setChecking(false);
    }
  };

  if (!serviceId) return null;

  return (
    <div className="space-y-2">
      <Label>Contato</Label>
      {selectedContactId ? (
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <span>{selectedContactName}</span>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setFormField("selectedContactId", null);
              setFormField("selectedContactName", null);
            }}
          >
            &times;
          </button>
        </div>
      ) : (
        <>
          <Input
            placeholder="Digite para buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={checking}
          />
          {checking && (
            <p className="text-xs text-muted-foreground">
              Verificando tickets abertos...
            </p>
          )}
          {search.trim().length > 0 && !checking && (
            <ScrollArea className="h-[200px] rounded-md border">
              {filtered.map((c) => {
                const displayName = c.internalName ?? c.name;
                const number = c.data?.number;
                return (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                    onClick={() => handleSelect(c.id, displayName)}
                    disabled={checking}
                  >
                    <div className="flex items-center justify-between">
                      <span>{displayName}</span>
                      {number && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {number}
                        </span>
                      )}
                    </div>
                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  Nenhum contato encontrado.
                </p>
              )}
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
