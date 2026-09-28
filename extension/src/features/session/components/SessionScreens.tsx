import { Button } from "@/components/ui/button";
import type { SessionScreen } from "@/lib/session-state";

export function LoadingScreen() {
  return <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>;
}

export function WaitingScreen() {
  return (
    <div className="py-10 text-center space-y-2">
      <p className="text-sm font-medium">Aguardando sessão do DigiSac…</p>
      <p className="text-xs text-muted-foreground">Se demorar, recarregue a página.</p>
    </div>
  );
}

interface MessageScreenProps {
  screen: Extract<SessionScreen, { kind: "message" }>;
  onRetry: () => void;
}

export function MessageScreen({ screen, onRetry }: MessageScreenProps) {
  return (
    <div className="py-10 text-center space-y-2">
      <p className="text-sm font-medium">{screen.title}</p>
      <p className="text-sm text-muted-foreground">{screen.text}</p>
      {screen.contact && <p className="text-xs text-muted-foreground">Contato: {screen.contact}</p>}
      {screen.retry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
