import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reportError } from "@/stores/session";
import { useUiStore } from "@/stores/ui";
import { openTicket } from "../api";
import { useTicketStore } from "../store";

export function SubmitBar() {
  const [loading, setLoading] = useState(false);
  const form = useTicketStore((s) => s.form);
  const setField = useTicketStore((s) => s.setField);
  const clearContact = useTicketStore((s) => s.clearContact);
  const setModalOpen = useUiStore((s) => s.setModalOpen);

  const canSubmit = Boolean(form.serviceId && form.contactId && form.departmentId);

  async function handleSubmit() {
    if (!form.serviceId || !form.contactId || !form.departmentId) return;
    setLoading(true);
    try {
      await openTicket({
        serviceId: form.serviceId,
        contactId: form.contactId,
        departmentId: form.departmentId,
        userId: form.userId,
        comment: form.comment.trim() || null,
        gclickClientId: form.company?.id ?? null,
      });
      toast.success("Chamado aberto com sucesso!");
      setModalOpen(false);
      clearContact();
      setField("comment", "");
    } catch (e) {
      reportError(e, "Erro ao abrir chamado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || loading}>
      {loading ? "Abrindo..." : "Abrir Chamado"}
    </Button>
  );
}
