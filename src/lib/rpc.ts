// Minimal JSON-RPC client for a public Ethereum node. No wallet, no signing:
// every call here is a read-only query.

export const DEFAULT_RPC_URL = 'https://ethereum-rpc.publicnode.com';

export interface RpcLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  removed?: boolean;
}

export class RpcError extends Error {
  readonly code: number | undefined;
  constructor(message: string, code?: number) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
  }
}

interface RpcResponse<T> {
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

export class RpcClient {
  private nextId = 1;
  constructor(
    readonly url: string = DEFAULT_RPC_URL,
    private readonly signal?: AbortSignal,
  ) {}

  private async post<T>(body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: this.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new RpcError('Unable to reach the RPC endpoint. Check your connection and try again.');
    }
    if (!response.ok) {
      throw new RpcError(`The RPC endpoint answered with HTTP ${response.status}.`);
    }
    return (await response.json()) as T;
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const id = this.nextId++;
    const json = await this.post<RpcResponse<T>>({ jsonrpc: '2.0', id, method, params });
    if (json.error) throw new RpcError(json.error.message, json.error.code);
    if (json.result === undefined) throw new RpcError(`Empty result for ${method}.`);
    return json.result;
  }

  /** Sends several calls in one HTTP request; results come back in call order. */
  async batch<T>(calls: { method: string; params: unknown[] }[]): Promise<T[]> {
    if (calls.length === 0) return [];
    const base = this.nextId;
    this.nextId += calls.length;
    const payload = calls.map((c, i) => ({ jsonrpc: '2.0', id: base + i, method: c.method, params: c.params }));
    const json = await this.post<RpcResponse<T>[] | RpcResponse<T>>(payload);
    if (!Array.isArray(json)) {
      if (json.error) throw new RpcError(json.error.message, json.error.code);
      throw new RpcError('The RPC endpoint does not support batch requests.');
    }
    const byId = new Map(json.map((r) => [r.id, r]));
    return payload.map((p, i) => {
      const r = byId.get(p.id);
      if (!r) throw new RpcError(`Missing batch result for call ${i}.`);
      if (r.error) throw new RpcError(r.error.message, r.error.code);
      if (r.result === undefined) throw new RpcError(`Empty batch result for call ${i}.`);
      return r.result;
    });
  }

  blockNumber(): Promise<number> {
    return this.call<string>('eth_blockNumber').then(hexToNumber);
  }

  getCode(address: string): Promise<string> {
    return this.call<string>('eth_getCode', [address, 'latest']);
  }

  ethCall(to: string, data: string): Promise<string> {
    return this.call<string>('eth_call', [{ to, data }, 'latest']);
  }

  getLogs(filter: { address: string; fromBlock: number; toBlock: number; topics: (string | string[] | null)[] }): Promise<RpcLog[]> {
    return this.call<RpcLog[]>('eth_getLogs', [
      {
        address: filter.address,
        fromBlock: toHex(filter.fromBlock),
        toBlock: toHex(filter.toBlock),
        topics: filter.topics,
      },
    ]);
  }

  /** Returns a map of block number -> unix timestamp (seconds). */
  async blockTimestamps(blocks: number[], onProgress?: (done: number, total: number) => void): Promise<Map<number, number>> {
    const unique = Array.from(new Set(blocks)).sort((a, b) => a - b);
    const out = new Map<number, number>();
    const chunk = 100;
    for (let i = 0; i < unique.length; i += chunk) {
      const slice = unique.slice(i, i + chunk);
      const results = await this.batch<{ number: string; timestamp: string } | null>(
        slice.map((n) => ({ method: 'eth_getBlockByNumber', params: [toHex(n), false] })),
      );
      results.forEach((block, j) => {
        const n = slice[j];
        if (block && n !== undefined) out.set(n, hexToNumber(block.timestamp));
      });
      onProgress?.(Math.min(i + chunk, unique.length), unique.length);
    }
    return out;
  }
}

export function toHex(n: number): string {
  return '0x' + n.toString(16);
}

export function hexToNumber(hex: string): number {
  return Number.parseInt(hex, 16);
}

export function hexToBigInt(hex: string): bigint {
  return BigInt(hex === '0x' || hex === '' ? '0x0' : hex);
}
