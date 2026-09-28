import { browser } from "wxt/browser";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSessionStore } from "@/stores/session";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function SettingsTab() {
  const session = useSessionStore((s) => s.state);
  if (session?.status !== "ready") return null;
  const { user, tenant } = session;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{tenant.name}</p>
        </div>
        {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
      </div>
      <Separator />
      <div className="space-y-1">
        <Label>Licença</Label>
        <p className="text-sm text-muted-foreground">
          {tenant.validUntil ? `Licença válida até ${formatDate(tenant.validUntil)}` : "Licença sem vencimento"}
        </p>
      </div>
      <div className="space-y-1">
        <Label>Versão da extensão</Label>
        <p className="text-sm text-muted-foreground">{browser.runtime.getManifest().version}</p>
      </div>
    </div>
  );
}
