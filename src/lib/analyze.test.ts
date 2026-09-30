import { describe, expect, it } from 'vitest';
import { decodeBatchData, decodeString, isAddress } from './abi';
import { ZERO, analyze, hourlyBuckets, largestBurst, levelForRate, pulsePeriodSeconds, type Transfer } from './analyze';

const T0 = 1_700_000_000; // arbitrary window end (unix seconds)

function transfer(overrides: Partial<Transfer>): Transfer {
  return {
    tokenId: '1',
    from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    timestamp: T0,
    blockNumber: 1,
    txHash: '0x1',
    logIndex: 0,
    standard: 'ERC-721',
    amount: '1',
    ...overrides,
  };
}

describe('levelForRate', () => {
  it('maps rate thresholds to labels', () => {
    expect(levelForRate(0)).toBe('Quiet');
    expect(levelForRate(0.9)).toBe('Quiet');
    expect(levelForRate(1)).toBe('Active');
    expect(levelForRate(4.99)).toBe('Active');
    expect(levelForRate(5)).toBe('Hot');
    expect(levelForRate(19.9)).toBe('Hot');
    expect(levelForRate(20)).toBe('Explosive');
    expect(levelForRate(500)).toBe('Explosive');
  });
});

describe('pulsePeriodSeconds', () => {
  it('gets faster as activity rises and stays within bounds', () => {
    const quiet = pulsePeriodSeconds(0);
    const active = pulsePeriodSeconds(3);
    const hot = pulsePeriodSeconds(12);
    const explosive = pulsePeriodSeconds(80);
    expect(quiet).toBe(2.4);
    expect(active).toBeLessThan(quiet);
    expect(hot).toBeLessThan(active);
    expect(explosive).toBeLessThan(hot);
    expect(explosive).toBeGreaterThanOrEqual(0.4);
  });
});

describe('largestBurst', () => {
  it('returns null for no transfers', () => {
    expect(largestBurst([])).toBeNull();
  });
  it('finds the densest 10-minute window', () => {
    const ts = [0, 100, 200, 5000, 5100, 5200, 5300, 20_000];
    expect(largestBurst(ts)).toEqual({ count: 4, start: 5000, end: 5300 });
  });
  it('does not count transfers outside the window', () => {
    expect(largestBurst([0, 601, 1202])?.count).toBe(1);
    expect(largestBurst([0, 600])?.count).toBe(2);
  });
});

describe('hourlyBuckets', () => {
  it('produces 24 aligned buckets ending at the window end hour', () => {
    const buckets = hourlyBuckets([T0 - 10, T0 - 3700, T0 - 3700, T0 - 90_000], T0);
    expect(buckets).toHaveLength(24);
    expect(buckets[23]!.start).toBe(Math.floor(T0 / 3600) * 3600);
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(3);
  });
});

describe('analyze', () => {
  it('counts wallets excluding the zero address and flags mints/burns', () => {
    const transfers = [
      transfer({ from: ZERO, to: '0xcccccccccccccccccccccccccccccccccccccccc' }),
      transfer({ to: ZERO }),
      transfer({}),
    ];
    const m = analyze(transfers, T0);
    expect(m.transferCount).toBe(3);
    expect(m.mints).toBe(1);
    expect(m.burns).toBe(1);
    expect(m.uniqueWallets).toBe(3);
  });
  it('computes the recent rate over the last six hours', () => {
    const transfers = [
      ...Array.from({ length: 12 }, (_, i) => transfer({ timestamp: T0 - i * 60 })),
      transfer({ timestamp: T0 - 10 * 3600 }),
    ];
    const m = analyze(transfers, T0);
    expect(m.recentRate).toBe(2);
    expect(m.level).toBe('Active');
    expect(m.mostActiveHour?.count).toBe(12);
    expect(m.burst?.count).toBe(11);
  });
  it('handles an empty window', () => {
    const m = analyze([], T0);
    expect(m.level).toBe('Quiet');
    expect(m.mostActiveHour).toBeNull();
    expect(m.burst).toBeNull();
  });
});

describe('abi helpers', () => {
  it('validates addresses', () => {
    expect(isAddress('0xBd3531dA5CF5857e7CfAA92426877b022e612cf8')).toBe(true);
    expect(isAddress('0xBd3531dA5CF5857e7CfAA92426877b022e612cf')).toBe(false);
    expect(isAddress('Bd3531dA5CF5857e7CfAA92426877b022e612cf8')).toBe(false);
    expect(isAddress('0xZZ3531dA5CF5857e7CfAA92426877b022e612cf8')).toBe(false);
  });
  it('decodes an ABI string', () => {
    const hex =
      '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000d507564677950656e6775696e7300000000000000000000000000000000000000';
    expect(decodeString(hex)).toBe('PudgyPenguins');
    expect(decodeString('0x')).toBeNull();
  });
  it('decodes TransferBatch data', () => {
    const word = (n: number) => n.toString(16).padStart(64, '0');
    const data = '0x' + word(64) + word(160) + word(2) + word(7) + word(9) + word(2) + word(1) + word(3);
    expect(decodeBatchData(data)).toEqual({ ids: [7n, 9n], values: [1n, 3n] });
  });
});
