import { Badge } from '@/components/ui/badge';

type Status = 'not_started' | 'in_progress' | 'completed';

const config: Record<Status, { label: string; variant: 'neutral' | 'active' | 'success'; live?: boolean }> = {
  not_started: { label: 'Queued', variant: 'neutral' },
  // Cyan, not the monochrome accent: a patient currently on a machine must not
  // share a colour with the buttons.
  in_progress: { label: 'In Progress', variant: 'active', live: true },
  completed: { label: 'Completed', variant: 'success' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, variant, live } = config[status];

  return (
    <Badge variant={variant} className="tracking-wide uppercase">
      {live && (
        <span className="animate-live size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      )}
      {label}
    </Badge>
  );
}
