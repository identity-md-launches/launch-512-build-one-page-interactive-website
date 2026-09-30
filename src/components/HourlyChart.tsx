import { useEffect, useId, useRef, useState } from 'react';
import type { HourBucket } from '../lib/analyze';
import { formatHourRange, pluralize } from '../lib/format';

const HEIGHT = 160;
const MIN_WIDTH = 280;
const PAD = { top: 12, right: 8, bottom: 24, left: 28 };

export function HourlyChart({ hourly, peakStart }: { hourly: HourBucket[]; peakStart: number | null }) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  const descId = useId();
  const hostRef = useRef<HTMLDivElement>(null);
  // The viewBox tracks the container width so axis text keeps its CSS pixel
  // size on phones instead of scaling down with a fixed-width SVG.
  const [WIDTH, setWidth] = useState(720);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => setWidth(Math.max(MIN_WIDTH, Math.round(host.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, ...hourly.map((b) => b.count));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / hourly.length;
  const gap = 2;
  const barW = Math.max(2, slot - gap);
  const ticks = [0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const hourLabel = (start: number) => new Date(start * 1000).getHours().toString().padStart(2, '0');
  const total = hourly.reduce((n, b) => n + b.count, 0);

  return (
    <section className="card chart-card enter" aria-labelledby={titleId}>
      <div className="section-heading">
        <h2 id={titleId} style={{ fontSize: 'var(--text-title)' }}>
          Transfers per hour
        </h2>
        <p id={descId}>Last 24 hours, oldest on the left. Peak hour highlighted.</p>
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span data-key="bar">Transfers</span>
        <span data-key="peak">Peak hour</span>
      </div>
      <div ref={hostRef} className="chart-host">
      <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-labelledby={titleId} aria-describedby={descId}>
        {ticks.map((t) => {
          const y = PAD.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line className="chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} />
              <text className="chart-axis" x={PAD.left - 6} y={y + 4} textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}
        {hourly.map((bucket, i) => {
          const h = (bucket.count / max) * innerH;
          const x = PAD.left + i * slot + gap / 2;
          const y = PAD.top + innerH - h;
          const isPeak = peakStart !== null && bucket.start === peakStart;
          const label = `${formatHourRange(bucket.start)}: ${pluralize(bucket.count, 'transfer')}`;
          return (
            <g key={bucket.start}>
              <rect className="chart-hit" x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH}>
                <title>{label}</title>
              </rect>
              <rect
                className="chart-bar"
                data-peak={isPeak}
                x={x}
                y={bucket.count === 0 ? PAD.top + innerH - 1 : y}
                width={barW}
                height={bucket.count === 0 ? 1 : h}
                rx={Math.min(4, barW / 2)}
              />
              {i % (WIDTH < 480 ? 6 : 4) === 0 && (
                <text className="chart-axis" x={x + barW / 2} y={HEIGHT - 6} textAnchor="middle">
                  {hourLabel(bucket.start)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
      <button type="button" className="button button-secondary button-small chart-table-toggle" aria-expanded={showTable} onClick={() => setShowTable((s) => !s)}>
        {showTable ? 'Hide hourly table' : 'Show hourly table'}
      </button>
      {showTable && (
        <table className="chart-table">
          <caption className="visually-hidden">Transfers per hour, last 24 hours</caption>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Transfers</th>
            </tr>
          </thead>
          <tbody>
            {hourly.map((bucket) => (
              <tr key={bucket.start}>
                <th scope="row">{formatHourRange(bucket.start)}</th>
                <td>{bucket.count}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td>{total}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
