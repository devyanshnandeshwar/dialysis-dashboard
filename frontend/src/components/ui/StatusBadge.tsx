type Status = 'not_started' | 'in_progress' | 'completed';

const config: Record<Status, { label: string; className: string; showPulse?: boolean }> = {
  not_started: {
    label: 'Not Started',
    className: 'bg-surface-alt/70 text-text-secondary border border-border-subtle shadow-xs',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-accent/15 text-text-primary border border-accent/40 shadow-xs',
    showPulse: true,
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/15 text-text-primary border border-success/40 shadow-xs',
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className, showPulse } = config[status];
  return (
    <div className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${className}`}>
      {showPulse && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />}
      {label}
    </div>
  );
}
