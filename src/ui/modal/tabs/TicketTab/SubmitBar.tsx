import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/state/store";
import { transferTicket } from "@/api/tickets";
import { addHistoryEntry } from "@/storage/history";
import { toast } from "sonner";

export function SubmitBar() {
  const [loading, setLoading] = useState(false);
  const form = useAppStore((s) => s.form);
  const auth = useAppStore((s) => s.auth);
  const services = useAppStore((s) => s.services);
  const departments = useAppStore((s) => s.departments);
  const usersFull = useAppStore((s) => s.usersFull);
  const setFormField = useAppStore((s) => s.setFormField);

  const canSubmit =
    form.selectedServiceId &&
    form.selectedContactId &&
    form.selectedDepartmentId;

  const handleSubmit = async () => {
    if (!canSubmit || !auth.email) return;

    setLoading(true);
    try {
      const payload: { departmentId: string; userId?: string; comments?: string } = {
        departmentId: form.selectedDepartmentId!,
      };
      if (form.selectedUserId) payload.userId = form.selectedUserId;
      if (form.comments.trim()) payload.comments = form.comments.trim();

      await transferTicket(form.selectedContactId!, payload);

      const serviceName =
        services.find((s) => s.id === form.selectedServiceId)?.name ?? "";
      const departmentName =
        departments.find((d) => d.id === form.selectedDepartmentId)?.name ?? "";
      const userName = form.selectedUserId
        ? usersFull.find((u) => u.id === form.selectedUserId)?.name
        : undefined;

      await addHistoryEntry({
        date: new Date().toISOString(),
        email: auth.email,
        serviceId: form.selectedServiceId!,
        serviceName,
        contactId: form.selectedContactId!,
        contactName: form.selectedContactName ?? "",
        departmentId: form.selectedDepartmentId!,
        departmentName,
        userId: form.selectedUserId ?? undefined,
        userName,
        comments: form.comments.trim() || undefined,
      });

      toast.success("Chamado aberto com sucesso!");
      setFormField("selectedContactId", null);
      setFormField("selectedContactName", null);
      setFormField("comments", "");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao abrir chamado"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className="w-full"
      onClick={handleSubmit}
      disabled={!canSubmit || loading}
    >
      {loading ? "Abrindo..." : "Abrir Chamado"}
    </Button>
  );
}
