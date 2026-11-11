import type { StatusLabel } from '@/content/types';

/** Literal class names, so Tailwind can see every one of them. */
const tones: Record<StatusLabel, string> = {
  LIVE: 'bg-live-soft text-live',
  DEMO: 'bg-demo-soft text-demo',
  LOCAL: 'bg-local-soft text-local',
  'OFF BY DEFAULT': 'bg-off-soft text-off',
};

/** A status label exactly as the architecture overview writes it, with its meaning for screen readers and on hover. */
export function StatusBadge({ label, meaning }: { label: StatusLabel; meaning: string }) {
  return (
    <span title={meaning} className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide ${tones[label]}`}>
      {label}
      <span className="sr-only"> — {meaning}</span>
    </span>
  );
}
