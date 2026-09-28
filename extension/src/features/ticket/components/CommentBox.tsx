import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTicketStore } from "../store";

export function CommentBox() {
  const comment = useTicketStore((s) => s.form.comment);
  const setField = useTicketStore((s) => s.setField);

  return (
    <div className="space-y-2">
      <Label>Comentário (opcional)</Label>
      <Textarea
        placeholder="Adicione um comentário..."
        value={comment}
        onChange={(e) => setField("comment", e.target.value)}
        rows={3}
      />
    </div>
  );
}
