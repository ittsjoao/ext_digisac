import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportError, useSessionStore } from "@/stores/session";
import { fetchContacts, fetchOpenTicket, registerContact } from "../api";
import { matchCompanyContacts } from "../match";
import { useTicketStore } from "../store";
import type { Contact, Named } from "../types";

type RegisterState =
  | { phase: "idle" }
  | { phase: "select-dept"; gclickName: string; numero: string }
  | { phase: "busy"; numero: string };

const NO_CONTACTS: Contact[] = [];
const NO_DEPARTMENTS: Named[] = [];
const displayName = (c: Contact) => c.internalName ?? c.name;

export function ContactPicker() {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [registerState, setRegisterState] = useState<RegisterState>({ phase: "idle" });

  const serviceId = useTicketStore((s) => s.form.serviceId);
  const contacts = useTicketStore((s) =>
    s.form.serviceId ? (s.contactsByService[s.form.serviceId] ?? NO_CONTACTS) : NO_CONTACTS,
  );
  const contactId = useTicketStore((s) => s.form.contactId);
  const contactName = useTicketStore((s) => s.form.contactName);
  const company = useTicketStore((s) => s.form.company);
  const users = useTicketStore((s) => s.catalog?.users);
  const setField = useTicketStore((s) => s.setField);
  const setContacts = useTicketStore((s) => s.setContacts);
  const clearContact = useTicketStore((s) => s.clearContact);
  const session = useSessionStore((s) => s.state);

  const myDepartments = useMemo(() => {
    const me = session?.status === "ready" ? session.user.id : null;
    return users?.find((u) => u.id === me)?.departments ?? NO_DEPARTMENTS;
  }, [users, session]);

  const matched = useMemo(
    () => (company && contacts.length > 0 ? matchCompanyContacts(company.telefones, contacts) : null),
    [company, contacts],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? contacts.filter((c) => displayName(c).toLowerCase().includes(q) || (c.number ?? "").toLowerCase().includes(q))
      : contacts;
    return [...base].sort((a, b) => displayName(a).localeCompare(displayName(b))).slice(0, q ? undefined : 10);
  }, [contacts, search]);

  async function handleSelect(c: Contact) {
    setChecking(true);
    try {
      const open = await fetchOpenTicket(c.id);
      if (open) {
        toast.error(`Este contato já possui um chamado em aberto com ${open.userName} do departamento ${open.departmentName}.`);
      } else {
        setField("contactId", c.id);
        setField("contactName", displayName(c));
      }
      setSearch("");
    } catch (e) {
      reportError(e, "Erro ao verificar tickets abertos");
    } finally {
      setChecking(false);
    }
  }

  async function handleRegister(gclickName: string, numero: string, departmentId: string | null) {
    if (!serviceId) return;
    setRegisterState({ phase: "busy", numero });
    try {
      await registerContact({ serviceId, name: gclickName, phone: numero, departmentId });
      toast.success("Contato cadastrado com sucesso!");
      setContacts(serviceId, await fetchContacts(serviceId));
    } catch (e) {
      reportError(e, "Erro ao cadastrar contato");
    } finally {
      setRegisterState({ phase: "idle" });
    }
  }

  function handleRegisterClick(gclickName: string, numero: string) {
    if (myDepartments.length > 1) setRegisterState({ phase: "select-dept", gclickName, numero });
    else void handleRegister(gclickName, numero, myDepartments[0]?.id ?? null);
  }

  if (!serviceId) return null;

  return (
    <div className="space-y-2">
      <Label>Contato</Label>
      {contactId ? (
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <span>{contactName}</span>
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={clearContact}>
            &times;
          </button>
        </div>
      ) : matched ? (
        <div className="h-[200px] overflow-y-auto overscroll-contain rounded-md border">
          {matched.matched.map(({ gclickName, contact }) => (
            <button
              key={contact.id}
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
              onClick={() => handleSelect(contact)}
              disabled={checking}
            >
              <div className="flex items-center justify-between">
                <span>
                  <span className="text-xs text-muted-foreground">Nome G-Click:</span> {gclickName}
                </span>
                <Badge variant="default" className="text-xs">
                  G-Click
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Nome DigiSac:</span> <span>{displayName(contact)}</span>
                {contact.number && <span className="ml-2">{contact.number}</span>}
              </div>
            </button>
          ))}
          {matched.unmatched.map(({ gclickName, numero }) => {
            const selectingDept = registerState.phase === "select-dept" && registerState.numero === numero;
            const busy = registerState.phase === "busy" && registerState.numero === numero;
            return (
              <div key={numero} className="w-full text-left px-3 py-2 text-sm border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="opacity-50">{gclickName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs opacity-50">
                      Apenas G-Click
                    </Badge>
                    <button
                      className="text-xs text-primary hover:underline disabled:opacity-40"
                      onClick={() => handleRegisterClick(gclickName, numero)}
                      disabled={registerState.phase !== "idle" || checking}
                    >
                      {busy ? "Cadastrando..." : "Cadastrar"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground opacity-50">{numero}</p>
                {selectingDept && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Selecione seu departamento:</p>
                    <div className="flex flex-wrap gap-1">
                      {myDepartments.map((d) => (
                        <button
                          key={d.id}
                          className="text-xs px-2 py-1 rounded border hover:bg-accent"
                          onClick={() => handleRegister(gclickName, numero, d.id)}
                        >
                          {d.name}
                        </button>
                      ))}
                      <button
                        className="text-xs px-2 py-1 rounded border hover:bg-accent text-muted-foreground"
                        onClick={() => setRegisterState({ phase: "idle" })}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {matched.matched.length === 0 && matched.unmatched.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Nenhum contato nesta empresa.</p>
          )}
        </div>
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
          {checking && <p className="text-xs text-muted-foreground">Verificando tickets abertos...</p>}
          {!checking && focused && (
            <div
              className="h-[200px] overflow-y-auto overscroll-contain rounded-md border"
              onPointerDown={(e) => e.preventDefault()}
            >
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  onClick={() => handleSelect(c)}
                  disabled={checking}
                >
                  <div className="flex items-center justify-between">
                    <span>{displayName(c)}</span>
                    {c.number && <span className="text-xs text-muted-foreground ml-2">{c.number}</span>}
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
              {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum contato encontrado.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
