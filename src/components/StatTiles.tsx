import type { PulseMetrics } from '../lib/analyze';
import { formatCount, formatDateTime, formatHourRange, formatTime, pluralize, timeZoneLabel } from '../lib/format';

interface Tile {
  label: string;
  value: string;
  detail: string;
}

export function StatTiles({ metrics }: { metrics: PulseMetrics }) {
  const tz = timeZoneLabel();
  const tiles: Tile[] = [
    {
      label: 'Transfers in 24 hours',
      value: formatCount(metrics.transferCount),
      detail:
        metrics.mints > 0 || metrics.burns > 0
          ? `${pluralize(metrics.mints, 'mint')}, ${pluralize(metrics.burns, 'burn')}`
          : 'No mints or burns',
    },
    {
      label: 'Unique wallets',
      value: formatCount(metrics.uniqueWallets),
      detail: 'Senders and receivers combined',
    },
    {
      label: 'Most active hour',
      value: metrics.mostActiveHour ? formatHourRange(metrics.mostActiveHour.start) : '—',
      detail: metrics.mostActiveHour
        ? `${pluralize(metrics.mostActiveHour.count, 'transfer')} · ${formatDateTime(metrics.mostActiveHour.start).split(',')[0]} · ${tz}`
        : 'No transfers in the window',
    },
    {
      label: `Largest burst in ${metrics.burstWindowSeconds / 60} min`,
      value: metrics.burst ? formatCount(metrics.burst.count) : '—',
      detail: metrics.burst
        ? metrics.burst.count === 1
          ? `Single transfer at ${formatTime(metrics.burst.start)}`
          : `From ${formatTime(metrics.burst.start)} to ${formatTime(metrics.burst.end)}`
        : 'No transfers in the window',
    },
  ];

  return (
    <div className="stat-grid">
      {tiles.map((tile) => (
        <div className="stat-tile enter" key={tile.label}>
          <span className="stat-label">{tile.label}</span>
          <span className="stat-value">{tile.value}</span>
          <span className="stat-detail">{tile.detail}</span>
        </div>
      ))}
    </div>
  );
}
