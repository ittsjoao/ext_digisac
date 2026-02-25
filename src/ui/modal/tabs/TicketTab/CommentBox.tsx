import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/state/store";

export function CommentBox() {
  const comments = useAppStore((s) => s.form.comments);
  const setFormField = useAppStore((s) => s.setFormField);

  return (
    <div className="space-y-2">
      <Label>Comentário (opcional)</Label>
      <Textarea
        placeholder="Adicione um comentário..."
        value={comments}
        onChange={(e) => setFormField("comments", e.target.value)}
        rows={3}
      />
    </div>
  );
}
