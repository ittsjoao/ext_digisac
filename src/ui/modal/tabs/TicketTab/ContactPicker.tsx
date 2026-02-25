import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/state/store";
import { checkOpenTicket } from "@/api/tickets";
import { toast } from "sonner";
import type { ContactItem } from "@/api/types";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function ContactPicker() {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [checking, setChecking] = useState(false);
  const serviceId = useAppStore((s) => s.form.selectedServiceId);
  const contactsByService = useAppStore((s) => s.contactsByService);
  const selectedContactId = useAppStore((s) => s.form.selectedContactId);
  const selectedContactName = useAppStore((s) => s.form.selectedContactName);
  const setFormField = useAppStore((s) => s.setFormField);
  const gclickEnabled = useAppStore((s) => s.gclickEnabled);
  const gclickClients = useAppStore((s) => s.gclickClients);
  const selectedGclickClientId = useAppStore(
    (s) => s.form.selectedGclickClientId,
  );

  const contacts = serviceId ? (contactsByService[serviceId] ?? []) : [];

  const selectedCompany = useMemo(
    () => gclickClients.find((c) => c.id === selectedGclickClientId) ?? null,
    [gclickClients, selectedGclickClientId],
  );

  const matchedContacts = useMemo(() => {
    if (!selectedCompany || contacts.length === 0) return null;

    const digisacByPhone = new Map<string, ContactItem>();
    for (const c of contacts) {
      const num = c.data?.number;
      if (num) digisacByPhone.set(normalizePhone(num), c);
    }

    const matched: { gclickName: string; digisacContact: ContactItem }[] = [];
    const unmatched: { gclickName: string; numero: string }[] = [];

    for (const tel of selectedCompany.telefones) {
      const normalized = normalizePhone(tel.numero);
      const found = digisacByPhone.get(normalized);
      if (found) {
        matched.push({ gclickName: tel.nome, digisacContact: found });
      } else {
        unmatched.push({ gclickName: tel.nome, numero: tel.numero });
      }
    }

    return { matched, unmatched };
  }, [selectedCompany, contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? contacts.filter((c) => {
          const displayName = c.internalName ?? c.name;
          const number = c.data?.number ?? "";
          return (
            displayName.toLowerCase().includes(q) ||
            number.toLowerCase().includes(q)
          );
        })
      : contacts;

    return [...base]
      .sort((a, b) =>
        (a.internalName ?? a.name).localeCompare(b.internalName ?? b.name),
      )
      .slice(0, q ? undefined : 10);
  }, [contacts, search]);

  const handleSelect = async (contactId: string, displayName: string) => {
    setChecking(true);
    try {
      const hasOpen = await checkOpenTicket(contactId);
      if (hasOpen) {
        toast.error("Este contato já possui um chamado em aberto.");
        setSearch("");
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

  const showGclickMatch = gclickEnabled && selectedCompany && matchedContacts;

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
      ) : showGclickMatch ? (
        <ScrollArea className="h-[200px] rounded-md border">
          {matchedContacts.matched.map(({ gclickName, digisacContact }) => {
            const displayName =
              digisacContact.internalName ?? digisacContact.name;
            return (
              <button
                key={digisacContact.id}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                onClick={() => handleSelect(digisacContact.id, displayName)}
                disabled={checking}
              >
                <div className="flex items-center justify-between">
                  <span>{gclickName}</span>
                  <Badge variant="default" className="text-xs">
                    G-Click
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{displayName}</p>
              </button>
            );
          })}
          {matchedContacts.unmatched.map(({ gclickName, numero }) => (
            <div
              key={numero}
              className="w-full text-left px-3 py-2 text-sm border-b last:border-b-0 opacity-50"
            >
              <div className="flex items-center justify-between">
                <span>{gclickName}</span>
                <Badge variant="secondary" className="text-xs">
                  Apenas G-Click
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{numero}</p>
            </div>
          ))}
          {matchedContacts.matched.length === 0 &&
            matchedContacts.unmatched.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                Nenhum contato nesta empresa.
              </p>
            )}
        </ScrollArea>
      ) : (
        <>
          <Input
            placeholder="Digite para buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            disabled={checking}
          />
          {checking && (
            <p className="text-xs text-muted-foreground">
              Verificando tickets abertos...
            </p>
          )}
          {!checking && focused && (
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
