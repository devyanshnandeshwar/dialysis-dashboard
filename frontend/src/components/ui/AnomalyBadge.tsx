import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatAnomaly } from '@/lib/anomaly';
import type { Anomaly } from '@/types';

// Icon differs per severity as well as colour. Colour alone must never be the
// signal -- roughly 8% of men cannot separate these hues reliably.
const severityConfig = {
  warning: { variant: 'warning' as const, Icon: AlertTriangle },
  critical: { variant: 'critical' as const, Icon: AlertCircle },
};

export default function AnomalyBadge({ anomaly }: { anomaly: Anomaly }) {
  const { variant, Icon } = severityConfig[anomaly.severity];
  const { label, value } = formatAnomaly(anomaly);

  return (
    <Badge variant={variant} title={anomaly.message}>
      <Icon aria-hidden="true" />
      <span className="opacity-80">{label}</span>
      {value && <span className="font-semibold tabular-nums">{value}</span>}
    </Badge>
  );
}
