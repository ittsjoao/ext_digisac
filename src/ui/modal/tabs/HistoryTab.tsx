import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getHistory, clearHistory } from "@/storage/history";
import type { HistoryEntry } from "@/api/types";
import { toast } from "sonner";

export function HistoryTab() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getHistory().then(setEntries);
  }, []);

  const handleClear = async () => {
    await clearHistory();
    setEntries([]);
    toast.success("Histórico limpo");
  };

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nenhum chamado registrado.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {entries.length} registro(s)
        </span>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Limpar histórico
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        {entries.map((entry, idx) => (
          <div key={idx}>
            <div className="py-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{entry.email}</span>
                <span>{new Date(entry.date).toLocaleString("pt-BR")}</span>
              </div>
              <p className="text-sm">
                <strong>{entry.serviceName}</strong> &rarr; {entry.contactName}{" "}
                &rarr; {entry.departmentName}
              </p>
              {entry.userName && (
                <p className="text-xs text-muted-foreground">
                  Responsável: {entry.userName}
                </p>
              )}
              {entry.comments && (
                <p className="text-xs italic">{entry.comments}</p>
              )}
            </div>
            {idx < entries.length - 1 && <Separator />}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
