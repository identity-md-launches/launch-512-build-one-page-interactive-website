const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat('en-US');

export function formatCount(n: number): string {
  return n >= 10_000 ? compact.format(n) : plain.format(n);
}

/** Full grouped digits, for values where every digit matters (block numbers). */
export function formatExact(n: number): string {
  return plain.format(n);
}

export function formatRate(ratePerHour: number): string {
  if (ratePerHour === 0) return '0';
  if (ratePerHour < 10) return ratePerHour.toFixed(1).replace(/\.0$/, '');
  return Math.round(ratePerHour).toString();
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…`;
}

/** Token ids can be 78 digits long; keep the head and tail readable. */
export function shortTokenId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

// 24-hour clock keeps hour ranges compact ("20:00–21:00") so they do not wrap
// mid-number inside a stat tile on narrow screens.
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const hourFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function formatTime(unixSeconds: number): string {
  return timeFormat.format(new Date(unixSeconds * 1000));
}

export function formatDateTime(unixSeconds: number): string {
  return dateTimeFormat.format(new Date(unixSeconds * 1000));
}

export function formatHourRange(startUnixSeconds: number): string {
  return `${hourFormat.format(new Date(startUnixSeconds * 1000))}–${hourFormat.format(new Date((startUnixSeconds + 3600) * 1000))}`;
}

export function formatIso(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

export function relativeTime(unixSeconds: number, now = Date.now() / 1000): string {
  const diff = Math.max(0, Math.round(now - unixSeconds));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

export function timeZoneLabel(): string {
  const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'local time';
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}
