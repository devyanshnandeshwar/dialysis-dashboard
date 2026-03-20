import { Badge } from '@/components/ui/badge';

type Status = 'not_started' | 'in_progress' | 'completed';

const config: Record<Status, { label: string; className: string }> = {
  not_started: {
    label: 'Not Started',
    className: 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-100',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-brand/10 text-brand border-brand/30 hover:bg-brand/10',
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/10 text-success border-success/30 hover:bg-success/10',
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
}
