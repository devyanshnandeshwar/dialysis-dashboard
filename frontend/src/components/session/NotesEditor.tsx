import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, X, Loader2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { updateNurseNotes } from '@/api/sessions';

interface Props {
  sessionId: string;
  initialNotes: string;
  onNotesSaved: (newNotes: string) => void;
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
      onNotesSaved(notes);
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
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="bg-surface-alt border-border-custom text-text-primary text-xs placeholder:text-text-muted focus-visible:ring-brand"
          placeholder="Enter nurse notes..."
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-brand text-white hover:bg-brand/90 h-7 text-xs gap-1"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="border-border-custom text-text-muted hover:text-text-primary hover:bg-surface-alt h-7 text-xs gap-1"
          >
            <X className="w-3 h-3" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 group" onClick={(e) => e.stopPropagation()}>
      <StickyNote className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
      <p className="text-xs text-text-muted flex-1">
        {initialNotes || (
          <span className="italic">No notes yet</span>
        )}
      </p>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-text-muted hover:text-brand hover:bg-surface-alt"
      >
        <Pencil className="w-3 h-3" />
      </Button>
    </div>
  );
}
