import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import type { Anomaly } from '@/types';

const severityConfig = {
  warning: {
    className: 'bg-warning/15 text-text-primary border-warning/30 hover:bg-warning/25 shadow-xs',
    Icon: AlertTriangle,
  },
  critical: {
    className: 'bg-critical/15 text-text-primary border-critical/30 hover:bg-critical/25 shadow-xs',
    Icon: AlertCircle,
  },
};

export default function AnomalyBadge({ anomaly }: { anomaly: Anomaly }) {
  const { className, Icon } = severityConfig[anomaly.severity];
  const anomalyClassName = anomaly.type === 'long_session'
    ? 'bg-accent/15 text-text-primary border-accent/30 hover:bg-accent/25 shadow-xs'
    : className;

  const typeLabels: Record<string, string> = {
    excess_weight_gain: 'Weight Gain',
    high_post_bp: 'High BP',
    short_session: 'Short Session',
    long_session: 'Long Session',
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium gap-1 ${anomalyClassName}`}>
      <Icon className="w-3 h-3" />
      {typeLabels[anomaly.type] || anomaly.type}
    </Badge>
  );
}
