import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/state/store";
import { checkOpenTicket } from "@/api/tickets";
import { searchContactByPhone, createContact } from "@/api/contacts";
import { getTags, addTagToContacts } from "@/api/tags";
import { sendRegistrationNotification, sendDuplicateNotification } from "@/api/messages";
import { toast } from "sonner";
import type { ContactItem } from "@/api/types";

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  // Strip Brazilian country code if present (requires >= 12 digits to avoid false strip on short numbers)
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Normalize mobile: DDD (2) + 9 + 8-digit number = 11 digits → strip the 9 → 10 digits
  if (digits.length === 11) {
    digits = digits.slice(0, 2) + digits.slice(3);
  }

  // Result: 10-digit canonical form (DDD + 8-digit number) for standard BR numbers,
  // or whatever remained after digit-strip for non-standard numbers (exact fallback).
  return digits;
}

type RegisterState =
  | { phase: "idle" }
  | { phase: "select-dept"; gclickName: string; numero: string }
  | { phase: "busy"; numero: string };

export function ContactPicker() {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [registerState, setRegisterState] = useState<RegisterState>({ phase: "idle" });

  const serviceId = useAppStore((s) => s.form.selectedServiceId);
  const contactsByService = useAppStore((s) => s.contactsByService);
  const selectedContactId = useAppStore((s) => s.form.selectedContactId);
  const selectedContactName = useAppStore((s) => s.form.selectedContactName);
  const setFormField = useAppStore((s) => s.setFormField);
  const gclickEnabled = useAppStore((s) => s.gclickEnabled);
  const gclickClients = useAppStore((s) => s.gclickClients);
  const selectedGclickClientId = useAppStore((s) => s.form.selectedGclickClientId);
  const usersFull = useAppStore((s) => s.usersFull);
  const departments = useAppStore((s) => s.departments);
  const authName = useAppStore((s) => s.auth.name);
  const authDeptNames = useAppStore((s) => s.auth.departmentNames);
  const services = useAppStore((s) => s.services);

  const contacts = serviceId ? (contactsByService[serviceId] ?? []) : [];

  const serviceName = useMemo(
    () => services.find((s) => s.id === serviceId)?.name ?? "",
    [services, serviceId],
  );

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
      const openTicket = await checkOpenTicket(contactId);
      if (openTicket) {
        const userName = usersFull.find((u) => u.id === openTicket.userId)?.name ?? "usuário desconhecido";
        const deptName = departments.find((d) => d.id === openTicket.departmentId)?.name ?? "departamento desconhecido";
        toast.error(`Este contato já possui um chamado em aberto com ${userName} do departamento ${deptName}.`);
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

  const handleRegister = async (gclickName: string, numero: string, dept: string) => {
    if (!serviceId) return;
    setRegisterState({ phase: "busy", numero });

    const normalized = normalizePhone(numero);
    const last8 = normalized.slice(-8);
    const apiNumber = normalized.length === 10 ? "55" + normalized : normalized;
    const notifyParams = { collaboratorName: authName ?? "", department: dept, serviceName };

    try {
      const existing = await searchContactByPhone(last8, serviceId);

      if (existing) {
        if (existing.tags.length > 0) {
          toast.error("Este contato já existe no DigiSac com tags associadas.");
          await sendDuplicateNotification(notifyParams).catch(() => {});
          return;
        }
        const tags = await getTags();
        const validoTag = tags.find((t) => t.label === "VALIDO");
        if (!validoTag) throw new Error("Tag VALIDO não encontrada");
        await addTagToContacts(validoTag.id, [existing.id]);
      } else {
        const tags = await getTags();
        const validoTag = tags.find((t) => t.label === "VALIDO");
        if (!validoTag) throw new Error("Tag VALIDO não encontrada");
        await createContact({ internalName: gclickName, number: apiNumber, serviceId, tagIds: [validoTag.id] });
      }

      toast.success("Contato cadastrado com sucesso!");
      await sendRegistrationNotification(notifyParams).catch(() => {});
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao cadastrar contato");
    } finally {
      setRegisterState({ phase: "idle" });
    }
  };

  const handleRegisterClick = (gclickName: string, numero: string) => {
    if (authDeptNames.length > 1) {
      setRegisterState({ phase: "select-dept", gclickName, numero });
    } else {
      handleRegister(gclickName, numero, authDeptNames[0] ?? "");
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
        <div className="h-[200px] overflow-y-auto overscroll-contain rounded-md border">
          {matchedContacts.matched.map(({ gclickName, digisacContact }) => {
            const displayName = digisacContact.internalName ?? digisacContact.name;
            const number = digisacContact.data?.number;
            return (
              <button
                key={digisacContact.id}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                onClick={() => handleSelect(digisacContact.id, displayName)}
                disabled={checking}
              >
                <div className="flex items-center justify-between">
                  <span>{gclickName}</span>
                  <Badge variant="default" className="text-xs">G-Click</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{displayName}</span>
                  {number && <span>{number}</span>}
                </div>
              </button>
            );
          })}
          {matchedContacts.unmatched.map(({ gclickName, numero }) => {
            const isSelectingDept =
              registerState.phase === "select-dept" && registerState.numero === numero;
            const isBusy =
              registerState.phase === "busy" && registerState.numero === numero;

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
                      {isBusy ? "Cadastrando..." : "Cadastrar"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground opacity-50">{numero}</p>
                {isSelectingDept && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Selecione seu departamento:</p>
                    <div className="flex flex-wrap gap-1">
                      {authDeptNames.map((dept) => (
                        <button
                          key={dept}
                          className="text-xs px-2 py-1 rounded border hover:bg-accent"
                          onClick={() => handleRegister(gclickName, numero, dept)}
                        >
                          {dept}
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
          {matchedContacts.matched.length === 0 && matchedContacts.unmatched.length === 0 && (
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
          {checking && (
            <p className="text-xs text-muted-foreground">Verificando tickets abertos...</p>
          )}
          {!checking && focused && (
            <div
              className="h-[200px] overflow-y-auto overscroll-contain rounded-md border"
              onPointerDown={(e) => e.preventDefault()}
            >
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
                        <span className="text-xs text-muted-foreground ml-2">{number}</span>
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
                <p className="p-3 text-sm text-muted-foreground">Nenhum contato encontrado.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
