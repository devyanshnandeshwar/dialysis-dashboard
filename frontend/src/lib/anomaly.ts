import type { Anomaly } from '@/types';

/**
 * Anomaly badges used to render only a category ("High BP"), leaving the actual
 * measurement in a `title` tooltip -- invisible on touch and unreachable by
 * keyboard. For a clinician the number is the information, so pull it out of
 * the detector's message and put it on the badge itself.
 *
 * Messages come from backend/src/utils/anomalyDetector.ts. If a message ever
 * stops matching, we fall back to the category label rather than showing a
 * half-parsed string.
 */
const EXTRACTORS: Record<string, { label: string; pattern: RegExp; format: (m: RegExpMatchArray) => string }> = {
  excess_weight_gain: {
    label: 'Weight Gain',
    pattern: /gain of ([\d.]+)kg/,
    format: (m) => `+${m[1]} kg`,
  },
  high_post_bp: {
    label: 'High BP',
    pattern: /systolic BP (\d+) mmHg/,
    format: (m) => `${m[1]} mmHg`,
  },
  short_session: {
    label: 'Short',
    pattern: /duration (\d+) min/,
    format: (m) => `${m[1]} min`,
  },
  long_session: {
    label: 'Long',
    pattern: /duration (\d+) min/,
    format: (m) => `${m[1]} min`,
  },
};

const FALLBACK_LABELS: Record<string, string> = {
  excess_weight_gain: 'Weight Gain',
  high_post_bp: 'High BP',
  short_session: 'Short Session',
  long_session: 'Long Session',
};

export function anomalyLabel(type: string): string {
  return FALLBACK_LABELS[type] || type.replace(/_/g, ' ');
}

/** `{ label: 'Post BP', value: '172 mmHg' }`, or a value-less fallback. */
export function formatAnomaly(anomaly: Anomaly): { label: string; value: string | null } {
  const extractor = EXTRACTORS[anomaly.type];
  if (!extractor) return { label: anomalyLabel(anomaly.type), value: null };

  const match = anomaly.message.match(extractor.pattern);
  if (!match) return { label: anomalyLabel(anomaly.type), value: null };

  return { label: extractor.label, value: extractor.format(match) };
}
