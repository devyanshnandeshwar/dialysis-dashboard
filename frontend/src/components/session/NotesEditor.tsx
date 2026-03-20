import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, X, Loader2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { updateNurseNotes } from '@/api/sessions';

interface Props {
  sessionId: string;
  initialNotes: string;
  onNotesSaved: (newNotes: string) => Promise<void> | void;
}

export default function NotesEditor({
  sessionId,
  initialNotes,
  onNotesSaved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNurseNotes(sessionId, notes);
      toast.success('Notes saved');
      await onNotesSaved(notes);
      setEditing(false);
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="bg-bg border-border text-text-primary text-sm placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent-glow rounded-md resize-none"
          placeholder="Enter nurse notes..."
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-accent text-white hover:brightness-110 h-8 text-xs gap-1.5 rounded-md shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Note
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
            className="text-text-muted hover:text-text-primary hover:bg-surface h-8 text-xs gap-1.5 rounded-md border border-border"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group cursor-pointer" onClick={() => setEditing(true)}>
      <StickyNote className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
      <p className="text-sm text-text-muted flex-1 leading-relaxed">
        {initialNotes || (
          <span className="italic opacity-60">No notes recorded yet.</span>
        )}
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-text-muted hover:text-accent hover:bg-accent-glow shrink-0 rounded-md"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
