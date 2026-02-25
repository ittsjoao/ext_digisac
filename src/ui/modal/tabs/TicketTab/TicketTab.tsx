import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/state/store";
import { listServices } from "@/api/services";
import { listDepartments } from "@/api/departments";
import { getUsersFull } from "@/api/users";
import { toast } from "sonner";
import { ServiceSelect } from "./ServiceSelect";
import { CompanyPicker } from "./CompanyPicker";
import { ContactPicker } from "./ContactPicker";
import { DepartmentSelect } from "./DepartmentSelect";
import { UserSelect } from "./UserSelect";
import { CommentBox } from "./CommentBox";
import { SubmitBar } from "./SubmitBar";

export function TicketTab() {
  const auth = useAppStore((s) => s.auth);
  const setServices = useAppStore((s) => s.setServices);
  const setDepartments = useAppStore((s) => s.setDepartments);
  const setUsersFull = useAppStore((s) => s.setUsersFull);
  const services = useAppStore((s) => s.services);

  useEffect(() => {
    if (!auth.email) return;
    if (services.length > 0) return;

    const load = async () => {
      try {
        const [svc, dept, users] = await Promise.all([
          listServices(),
          listDepartments(),
          getUsersFull(),
        ]);
        setServices(svc);
        setDepartments(dept);
        setUsersFull(users);
      } catch {
        toast.error("Erro ao carregar dados");
      }
    };

    load();
  }, [auth.email]);

  if (!auth.email) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Faça login na aba <span className="font-medium">Configurações</span>{" "}
          para abrir chamados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <ServiceSelect />
      <CompanyPicker />
      <ContactPicker />
      <DepartmentSelect />
      <UserSelect />
      <CommentBox />
      <Separator />
      <SubmitBar />
    </div>
  );
}
