import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/state/store";
import { validateUserByEmail } from "@/api/users";
import { setAuth } from "@/storage/auth";
import { toast } from "sonner";

export function LoginBlock() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAppStore((s) => s.auth);
  const setAuthStore = useAppStore((s) => s.setAuth);
  const clearAuthStore = useAppStore((s) => s.clearAuth);

  if (auth.email) {
    return (
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">{auth.name}</p>
          <p className="text-xs text-muted-foreground">{auth.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => clearAuthStore()}>
          Sair
        </Button>
      </div>
    );
  }

  const handleLogin = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const user = await validateUserByEmail(trimmed);

      if (!user) {
        toast.error("Usuário não autorizado. Solicite ao T&I.");
        return;
      }

      const authData = {
        email: user.email,
        name: user.name,
        departmentNames: user.departments.map((d) => d.name),
      };

      await setAuth(authData);
      setAuthStore(authData);
      toast.success(`Bem-vindo, ${user.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="login-email">E-mail</Label>
      <div className="flex gap-2">
        <Input
          id="login-email"
          type="email"
          placeholder="nome.sobrenome@email.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <Button onClick={handleLogin} disabled={loading}>
          {loading ? "..." : "Entrar"}
        </Button>
      </div>
    </div>
  );
}
