import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import type { Anomaly } from '@/types';

const severityConfig = {
  warning: {
    className: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/10',
    Icon: AlertTriangle,
  },
  critical: {
    className: 'bg-critical/10 text-critical border-critical/30 hover:bg-critical/10',
    Icon: AlertCircle,
  },
};

export default function AnomalyBadge({ anomaly }: { anomaly: Anomaly }) {
  const { className, Icon } = severityConfig[anomaly.severity];

  const typeLabels: Record<string, string> = {
    excess_weight_gain: 'Weight Gain',
    high_post_bp: 'High BP',
    short_session: 'Short Session',
    long_session: 'Long Session',
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium gap-1 ${className}`}>
      <Icon className="w-3 h-3" />
      {typeLabels[anomaly.type] || anomaly.type}
    </Badge>
  );
}
