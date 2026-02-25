import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { STORAGE_KEY_TOKEN } from "@/app/config";
import { BASE_URL } from "@/app/config";
import { useAppStore } from "@/state/store";
import { isAdmin } from "@/app/permissions";
import { LoginBlock } from "./TicketTab/LoginBlock";
import { toast } from "sonner";

export function SettingsTab() {
  const [tokenValue, setTokenValue] = useState("");
  const [saved, setSaved] = useState(false);
  const email = useAppStore((s) => s.auth.email);
  const admin = email ? isAdmin(email) : false;

  return (
    <div className="space-y-4 py-4">
      <LoginBlock />

      {admin && (
        <>
          {/*<Separator />*/}
          {/*<div className="space-y-2">
            <Label htmlFor="token">API Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Cole seu token aqui"
              value={tokenValue}
              onChange={(e) => {
                setTokenValue(e.target.value);
                setSaved(false);
              }}
            />
            {!saved && (
              <p className="text-sm text-amber-600">
                Configure o token para usar a extensão
              </p>
            )}
          </div>*/}
          {/*<Button onClick={handleSave}>Salvar</Button>*/}
          <Separator />
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input value={BASE_URL} readOnly className="bg-muted" />
          </div>
        </>
      )}
    </div>
  );
}
