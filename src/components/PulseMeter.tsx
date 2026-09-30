import { useState, type CSSProperties } from 'react';
import { LEVEL_THRESHOLDS, pulsePeriodSeconds, type ActivityLevel, type PulseMetrics } from '../lib/analyze';
import { formatRate } from '../lib/format';
import { LevelIcon, PauseIcon, PlayIcon } from './Icons';

const LEVELS: ActivityLevel[] = ['Quiet', 'Active', 'Hot', 'Explosive'];

const DESCRIPTIONS: Record<ActivityLevel, string> = {
  Quiet: 'Fewer than 1 transfer per hour recently.',
  Active: 'Steady movement: 1 to 5 transfers per hour.',
  Hot: 'Busy: 5 to 20 transfers per hour.',
  Explosive: 'More than 20 transfers per hour.',
};

export function PulseMeter({ metrics }: { metrics: PulseMetrics }) {
  const [playing, setPlaying] = useState(true);
  const period = pulsePeriodSeconds(metrics.recentRate);
  const style = { '--pulse-period': `${period}s` } as CSSProperties;

  return (
    <section className="card pulse-card enter" aria-labelledby="pulse-heading">
      <div className="pulse" data-level={metrics.level} data-playing={playing} style={style} aria-hidden="true">
        <span className="pulse-ring" />
        <span className="pulse-ring" />
        <span className="pulse-ring" />
        <span className="pulse-core" />
      </div>
      <div className="pulse-readout">
        <h2 className="pulse-label" id="pulse-heading">
          Activity level
        </h2>
        <p className="pulse-level" data-level={metrics.level}>
          <LevelIcon level={metrics.level} />
          <span>{metrics.level}</span>
        </p>
        <p className="pulse-rate">
          <strong>{formatRate(metrics.recentRate)}</strong> transfers per hour over the last {metrics.recentWindowHours} hours.{' '}
          {DESCRIPTIONS[metrics.level]}
        </p>
        <ol className="meter" aria-label="Activity scale">
          {LEVELS.map((level) => {
            const min = LEVEL_THRESHOLDS.find((t) => t.level === level)?.min ?? 0;
            return (
              <li key={level} data-active={level === metrics.level} aria-current={level === metrics.level ? 'true' : undefined}>
                <span>
                  {level}
                  {min > 0 && <span className="visually-hidden"> from {min} per hour</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="pulse-controls">
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
            {playing ? 'Pause pulse' : 'Resume pulse'}
          </button>
        </div>
      </div>
    </section>
  );
}
