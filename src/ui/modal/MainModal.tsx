import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { useAppStore } from "@/state/store";
import { isAdmin } from "@/app/permissions";
import { TicketTab } from "./tabs/TicketTab/TicketTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { AdminTab } from "./tabs/AdminTab/AdminTab";
import { HistoryTab } from "./tabs/HistoryTab";

export function MainModal() {
  const open = useAppStore((s) => s.modalOpen);
  const setOpen = useAppStore((s) => s.setModalOpen);
  const email = useAppStore((s) => s.auth.email);
  const showAdmin = email ? isAdmin(email) : false;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <Tabs defaultValue="ticket" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="ticket" className="flex-1">
                Chamado
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                Configurações
              </TabsTrigger>
              {showAdmin && (
                <TabsTrigger value="admin" className="flex-1">
                  Admin
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="flex-1">
                Histórico
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ticket">
              <TicketTab />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab />
            </TabsContent>
            {showAdmin && (
              <TabsContent value="admin">
                <AdminTab />
              </TabsContent>
            )}
            <TabsContent value="history">
              <HistoryTab />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Toaster richColors position="top-right" />
    </>
  );
}
