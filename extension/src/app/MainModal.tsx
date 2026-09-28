import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useShadowRoot } from "@/components/shadow-root";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "@/features/history/HistoryTab";
import { TenantForm } from "@/features/onboarding/components/TenantForm";
import { AdminTab } from "@/features/permissions/AdminTab";
import { LoadingScreen, MessageScreen, WaitingScreen } from "@/features/session/components/SessionScreens";
import { SettingsTab } from "@/features/settings/SettingsTab";
import { TicketTab } from "@/features/ticket/components/TicketTab";
import { useTicketStore } from "@/features/ticket/store";
import { screenFor } from "@/lib/session-state";
import { useSessionStore } from "@/stores/session";
import { useUiStore } from "@/stores/ui";

export function MainModal() {
  const open = useUiStore((s) => s.modalOpen);
  const setOpen = useUiStore((s) => s.setModalOpen);
  const session = useSessionStore((s) => s.state);
  const refresh = useSessionStore((s) => s.refresh);
  const [activeTab, setActiveTab] = useState("ticket");
  const portalContainer = useShadowRoot();

  useEffect(() => {
    if (!open) return;
    setActiveTab("ticket");
    // Erro de catálogo (ex.: NO_PERMISSION_RULE) não fica em cache: ao abrir, o TicketTab tenta de novo.
    const ticket = useTicketStore.getState();
    if (ticket.catalogError) ticket.setCatalog(null, null);
    void refresh();
  }, [open, refresh]);

  // Outro usuário ou outra empresa: descarta catálogo, contatos e formulário em cache.
  const sessionKey = session?.status === "ready" ? `${session.user.id}|${session.tenant.name}` : "";
  useEffect(() => {
    useTicketStore.getState().clear();
  }, [sessionKey]);

  const screen = session ? screenFor(session) : null;
  const isAdmin = session?.status === "ready" && session.user.isAdmin;

  function body() {
    if (!screen) return <LoadingScreen />;
    switch (screen.kind) {
      case "waiting":
        return <WaitingScreen />;
      case "register":
        return <TenantForm mode="register" onDone={refresh} />;
      case "credentials":
        return <TenantForm mode="credentials" onDone={refresh} />;
      case "message":
        return <MessageScreen screen={screen} onRetry={refresh} />;
      case "ready":
        return (
          <Tabs value={activeTab} onValueChange={setActiveTab} activationMode="manual" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="ticket" className="flex-1">
                Chamado
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                Histórico
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                Configurações
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="flex-1">
                  Admin
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="ticket">
              <TicketTab />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab />
              {isAdmin && <TenantForm mode="credentials" onDone={refresh} />}
            </TabsContent>
            {isAdmin && (
              <TabsContent value="admin">
                <AdminTab />
              </TabsContent>
            )}
          </Tabs>
        );
    }
  }

  return (
    <>
      {portalContainer &&
        createPortal(
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 49,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              opacity: open ? 1 : 0,
              pointerEvents: open ? "auto" : "none",
              transition: "opacity 0.2s ease",
            }}
          />,
          portalContainer,
        )}
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">{body()}</DialogContent>
      </Dialog>
      {createPortal(<Toaster richColors position="top-right" />, document.body)}
    </>
  );
}
