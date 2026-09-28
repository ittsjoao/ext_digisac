import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { registerTenant, updateCredentials } from "@/lib/backend";
import { reportError } from "@/stores/session";

interface TenantFormProps {
  mode: "register" | "credentials";
  onDone: () => void;
}

export function TenantForm({ mode, onDone }: TenantFormProps) {
  const register = mode === "register";
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const id = clientId.trim();
    const secret = clientSecret.trim();
    const hasGclick = Boolean(id || secret);
    if (hasGclick && !(id && secret)) {
      toast.error("Preencha client_id e client_secret do G-Click.");
      return;
    }
    if (register && (!name.trim() || !token.trim())) {
      toast.error("Informe o nome da empresa e o token de API do DigiSac.");
      return;
    }
    if (!register && !token.trim() && !hasGclick) {
      toast.error("Informe ao menos um token.");
      return;
    }
    const gclick = hasGclick ? { clientId: id, clientSecret: secret } : undefined;
    setBusy(true);
    try {
      if (register) await registerTenant({ name: name.trim(), digisacToken: token.trim(), gclick });
      else await updateCredentials({ digisacToken: token.trim() || undefined, gclick });
      toast.success(register ? "Cadastro enviado. Aguarde a liberação." : "Credenciais atualizadas.");
      onDone();
    } catch (e) {
      reportError(e, "Erro ao enviar os dados");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{register ? "Cadastrar empresa" : "Atualizar credenciais"}</p>
        <p className="text-xs text-muted-foreground">
          {register
            ? "Sua empresa ainda não usa a extensão. Como administrador do DigiSac, envie os dados para liberação."
            : "O token da empresa foi recusado. Informe um token novo."}
        </p>
      </div>
      {register && (
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Nome da empresa</Label>
          <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="tenant-token">Token de API do DigiSac{register ? "" : " (opcional)"}</Label>
        <Input id="tenant-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label>G-Click (opcional)</Label>
        <Input placeholder="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} />
        <Input
          placeholder="client_secret"
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
      </div>
      <Button className="w-full" onClick={submit} disabled={busy}>
        {busy ? "Enviando..." : register ? "Enviar cadastro" : "Atualizar"}
      </Button>
    </div>
  );
}
