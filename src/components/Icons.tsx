import type { SVGProps } from 'react';

// One icon set, 1.5px stroke to sit beside regular-weight text; every icon
// uses currentColor so state comes from CSS.
const base: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function CopyIcon() {
  return (
    <svg {...base}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...base}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg {...base} width={14} height={14}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg {...base} width={14} height={14}>
      <path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg {...base}>
      <path d="M8 6v12M16 6v12" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg {...base}>
      <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Level glyphs: a redundant, non-color cue for the activity level. */
export function LevelIcon({ level }: { level: 'Quiet' | 'Active' | 'Hot' | 'Explosive' }) {
  const bars = { Quiet: 1, Active: 2, Hot: 3, Explosive: 4 }[level];
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={2 + i * 5.5} y={20 - (i + 1) * 4.5} width="4" height={(i + 1) * 4.5} rx="1" opacity={i < bars ? 1 : 0.22} />
      ))}
    </svg>
  );
}
