import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/backend";
import { reportError } from "@/stores/session";
import { fetchCatalog } from "../api";
import { useTicketStore } from "../store";
import { CommentBox } from "./CommentBox";
import { CompanyPicker } from "./CompanyPicker";
import { ContactPicker } from "./ContactPicker";
import { DepartmentSelect } from "./DepartmentSelect";
import { ServiceSelect } from "./ServiceSelect";
import { SubmitBar } from "./SubmitBar";
import { UserSelect } from "./UserSelect";

export function TicketTab() {
  const catalog = useTicketStore((s) => s.catalog);
  const catalogError = useTicketStore((s) => s.catalogError);
  const setCatalog = useTicketStore((s) => s.setCatalog);

  useEffect(() => {
    if (catalog || catalogError) return;
    let alive = true;
    fetchCatalog()
      .then((c) => {
        if (alive) setCatalog(c, null);
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.code === "NO_PERMISSION_RULE") setCatalog(null, e.message);
        else reportError(e, "Erro ao carregar dados");
      });
    return () => {
      alive = false;
    };
  }, [catalog, catalogError, setCatalog]);

  if (catalogError) return <div className="py-8 text-center text-sm text-muted-foreground">{catalogError}</div>;
  if (!catalog) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;

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
