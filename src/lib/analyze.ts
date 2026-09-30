// Pure analysis: turns a list of timestamped transfers into the pulse metrics.
// No network access here so the logic is unit-testable.

export interface Transfer {
  tokenId: string;
  from: string;
  to: string;
  /** unix seconds */
  timestamp: number;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  standard: 'ERC-721' | 'ERC-1155';
  /** ERC-1155 amount; 1 for ERC-721 */
  amount: string;
}

export type ActivityLevel = 'Quiet' | 'Active' | 'Hot' | 'Explosive';

export interface HourBucket {
  /** start of the hour, unix seconds */
  start: number;
  count: number;
}

export interface Burst {
  count: number;
  /** unix seconds of the first and last transfer in the burst */
  start: number;
  end: number;
}

export interface PulseMetrics {
  transferCount: number;
  uniqueWallets: number;
  mints: number;
  burns: number;
  /** Most active clock hour across the window, or null with no transfers. */
  mostActiveHour: HourBucket | null;
  /** Largest number of transfers inside any window of `burstWindowSeconds`. */
  burst: Burst | null;
  burstWindowSeconds: number;
  /** Transfers per hour over the recent rate window. */
  recentRate: number;
  recentWindowHours: number;
  level: ActivityLevel;
  /** Twenty-four hourly buckets, oldest first, aligned to the window end. */
  hourly: HourBucket[];
}

export const ZERO = '0x0000000000000000000000000000000000000000';
export const BURST_WINDOW_SECONDS = 10 * 60;
export const RECENT_WINDOW_HOURS = 6;

/** Thresholds are transfers per hour over the recent window. */
export const LEVEL_THRESHOLDS: { level: ActivityLevel; min: number }[] = [
  { level: 'Explosive', min: 20 },
  { level: 'Hot', min: 5 },
  { level: 'Active', min: 1 },
  { level: 'Quiet', min: 0 },
];

export function levelForRate(ratePerHour: number): ActivityLevel {
  for (const t of LEVEL_THRESHOLDS) if (ratePerHour >= t.min) return t.level;
  return 'Quiet';
}

/**
 * Maps the recent rate to a pulse period in seconds. Quiet collections beat
 * slowly (2.4s); the period shortens smoothly as the rate climbs and floors at
 * 0.4s so the animation never turns into a flicker.
 */
export function pulsePeriodSeconds(ratePerHour: number): number {
  const slowest = 2.4;
  const fastest = 0.4;
  const period = slowest / (1 + ratePerHour / 4);
  return Math.max(fastest, Math.min(slowest, Number(period.toFixed(2))));
}

export function largestBurst(timestamps: number[], windowSeconds = BURST_WINDOW_SECONDS): Burst | null {
  if (timestamps.length === 0) return null;
  const sorted = [...timestamps].sort((a, b) => a - b);
  let best: Burst = { count: 1, start: sorted[0]!, end: sorted[0]! };
  let lo = 0;
  for (let hi = 0; hi < sorted.length; hi++) {
    while (sorted[hi]! - sorted[lo]! > windowSeconds) lo++;
    const count = hi - lo + 1;
    if (count > best.count) best = { count, start: sorted[lo]!, end: sorted[hi]! };
  }
  return best;
}

export function hourlyBuckets(timestamps: number[], windowEnd: number, hours = 24): HourBucket[] {
  const endHour = Math.floor(windowEnd / 3600) * 3600;
  const buckets: HourBucket[] = [];
  for (let i = hours - 1; i >= 0; i--) buckets.push({ start: endHour - i * 3600, count: 0 });
  const first = buckets[0]!.start;
  for (const t of timestamps) {
    const index = Math.floor((t - first) / 3600);
    if (index >= 0 && index < buckets.length) buckets[index]!.count++;
  }
  return buckets;
}

export function analyze(transfers: Transfer[], windowEnd: number): PulseMetrics {
  const timestamps = transfers.map((t) => t.timestamp);
  const wallets = new Set<string>();
  let mints = 0;
  let burns = 0;
  for (const t of transfers) {
    if (t.from === ZERO) mints++;
    else wallets.add(t.from);
    if (t.to === ZERO) burns++;
    else wallets.add(t.to);
  }

  const hourly = hourlyBuckets(timestamps, windowEnd);
  let mostActiveHour: HourBucket | null = null;
  for (const bucket of hourly) {
    if (bucket.count > 0 && (mostActiveHour === null || bucket.count > mostActiveHour.count)) mostActiveHour = bucket;
  }

  const recentStart = windowEnd - RECENT_WINDOW_HOURS * 3600;
  const recentCount = timestamps.filter((t) => t >= recentStart).length;
  const recentRate = recentCount / RECENT_WINDOW_HOURS;

  return {
    transferCount: transfers.length,
    uniqueWallets: wallets.size,
    mints,
    burns,
    mostActiveHour,
    burst: largestBurst(timestamps),
    burstWindowSeconds: BURST_WINDOW_SECONDS,
    recentRate,
    recentWindowHours: RECENT_WINDOW_HOURS,
    level: levelForRate(recentRate),
    hourly,
  };
}
