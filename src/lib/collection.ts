// Orchestrates the read-only RPC calls for one collection: validates the
// contract, scans the last 24 hours of transfer logs and resolves timestamps.

import {
  INTERFACE_ERC1155,
  INTERFACE_ERC721,
  SELECTOR_NAME,
  SELECTOR_SYMBOL,
  TOPIC_ERC1155_BATCH,
  TOPIC_ERC1155_SINGLE,
  TOPIC_ERC721_TRANSFER,
  decodeBatchData,
  decodeBool,
  decodeString,
  encodeSupportsInterface,
  normalizeAddress,
  topicToAddress,
} from './abi';
import type { Transfer } from './analyze';
import { RpcClient, RpcError, hexToBigInt, hexToNumber, type RpcLog } from './rpc';

/** ~24 hours at 12-second slots. Public nodes serve this range without an archive key. */
export const WINDOW_BLOCKS = 7200;
/** Blocks per eth_getLogs request; halved automatically when a node refuses a range. */
const CHUNK_BLOCKS = 1800;
/** Short range scanned first for contracts that do not self-report an NFT standard. */
const PROBE_BLOCKS = 100;
/** Upper bound on transfers kept for analysis, newest first. */
export const MAX_TRANSFERS = 4000;

export interface CollectionInfo {
  address: string;
  name: string | null;
  symbol: string | null;
  standard: 'ERC-721' | 'ERC-1155' | 'unknown';
}

export interface ScanResult {
  info: CollectionInfo;
  transfers: Transfer[];
  fromBlock: number;
  toBlock: number;
  /** unix seconds of the latest block */
  windowEnd: number;
  /** true when the log cap was hit and older transfers were dropped */
  truncated: boolean;
  /** ERC-20 style transfers seen; hints that this is a token, not an NFT */
  looksLikeErc20: boolean;
}

export type Progress = { phase: 'contract' | 'logs' | 'timestamps'; detail: string };

export class CollectionError extends Error {
  constructor(
    message: string,
    readonly kind: 'not-a-contract' | 'not-an-nft' | 'rpc',
  ) {
    super(message);
    this.name = 'CollectionError';
  }
}

export async function scanCollection(
  rawAddress: string,
  rpc: RpcClient,
  onProgress: (p: Progress) => void,
): Promise<ScanResult> {
  const address = normalizeAddress(rawAddress);

  onProgress({ phase: 'contract', detail: 'Checking the contract…' });
  const [code, latest] = await Promise.all([rpc.getCode(address), rpc.blockNumber()]);
  if (code === '0x' || code === '0x0' || code === '') {
    throw new CollectionError(
      'No contract is deployed at this address. Paste the collection’s contract address, not a wallet address.',
      'not-a-contract',
    );
  }

  const info = await describeContract(address, rpc);

  const toBlock = latest;
  const fromBlock = Math.max(0, latest - WINDOW_BLOCKS + 1);

  if (info.standard === 'unknown') {
    // The contract does not report ERC-721/1155 support. Probe a short range
    // first so a busy fungible token (thousands of logs per block range) is
    // rejected cheaply instead of after a full 24-hour scan.
    onProgress({ phase: 'logs', detail: 'Checking recent transfer events…' });
    const probe = await scanLogs(address, Math.max(fromBlock, toBlock - PROBE_BLOCKS + 1), toBlock, rpc, () => {});
    const probeNft = probe.some((l) => l.topics[0] !== TOPIC_ERC721_TRANSFER || l.topics.length === 4);
    const probeErc20 = probe.some((l) => l.topics[0] === TOPIC_ERC721_TRANSFER && l.topics.length === 3);
    if (probeErc20 && !probeNft) {
      throw new CollectionError(
        'This contract emits fungible token transfers, not NFT transfers. Enter an ERC-721 or ERC-1155 collection address.',
        'not-an-nft',
      );
    }
  }

  const logs = await scanLogs(address, fromBlock, toBlock, rpc, onProgress);

  const nftLogs = logs.filter((l) => l.topics[0] !== TOPIC_ERC721_TRANSFER || l.topics.length === 4);
  const looksLikeErc20 = logs.some((l) => l.topics[0] === TOPIC_ERC721_TRANSFER && l.topics.length === 3);

  if (info.standard === 'unknown' && nftLogs.length === 0) {
    throw new CollectionError(
      looksLikeErc20
        ? 'This contract emits fungible token transfers, not NFT transfers. Enter an ERC-721 or ERC-1155 collection address.'
        : 'This contract does not report itself as an NFT collection and emitted no NFT transfers in the last 24 hours. Check the address and try again.',
      'not-an-nft',
    );
  }

  let truncated = false;
  let kept = nftLogs;
  if (kept.length > MAX_TRANSFERS) {
    kept = kept.slice(kept.length - MAX_TRANSFERS);
    truncated = true;
  }

  const blockNumbers = kept.map((l) => hexToNumber(l.blockNumber));
  blockNumbers.push(toBlock);
  onProgress({ phase: 'timestamps', detail: 'Resolving block timestamps…' });
  const timestamps = await rpc.blockTimestamps(blockNumbers, (done, total) =>
    onProgress({ phase: 'timestamps', detail: `Resolving block timestamps (${done} of ${total})…` }),
  );
  const windowEnd = timestamps.get(toBlock) ?? Math.floor(Date.now() / 1000);

  const transfers = decodeTransfers(kept, timestamps).sort(
    (a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex,
  );

  const standard = info.standard === 'unknown' ? (transfers[0]?.standard ?? 'unknown') : info.standard;
  return { info: { ...info, standard }, transfers, fromBlock, toBlock, windowEnd, truncated, looksLikeErc20 };
}

async function describeContract(address: string, rpc: RpcClient): Promise<CollectionInfo> {
  const safeCall = async (data: string): Promise<string | null> => {
    try {
      return await rpc.ethCall(address, data);
    } catch (error) {
      if (error instanceof RpcError) return null;
      throw error;
    }
  };
  const [is721, is1155, nameHex, symbolHex] = await Promise.all([
    safeCall(encodeSupportsInterface(INTERFACE_ERC721)),
    safeCall(encodeSupportsInterface(INTERFACE_ERC1155)),
    safeCall(SELECTOR_NAME),
    safeCall(SELECTOR_SYMBOL),
  ]);
  const standard = is721 && decodeBool(is721) ? 'ERC-721' : is1155 && decodeBool(is1155) ? 'ERC-1155' : 'unknown';
  return {
    address,
    name: nameHex ? decodeString(nameHex) : null,
    symbol: symbolHex ? decodeString(symbolHex) : null,
    standard,
  };
}

async function scanLogs(
  address: string,
  fromBlock: number,
  toBlock: number,
  rpc: RpcClient,
  onProgress: (p: Progress) => void,
): Promise<RpcLog[]> {
  const topics = [[TOPIC_ERC721_TRANSFER, TOPIC_ERC1155_SINGLE, TOPIC_ERC1155_BATCH]];
  const logs: RpcLog[] = [];
  let chunk = CHUNK_BLOCKS;
  let start = fromBlock;
  const total = toBlock - fromBlock + 1;
  while (start <= toBlock) {
    const end = Math.min(toBlock, start + chunk - 1);
    const scanned = Math.round(((start - fromBlock) / total) * 100);
    onProgress({ phase: 'logs', detail: `Scanning blocks ${start.toLocaleString('en-US')}–${end.toLocaleString('en-US')} (${scanned}%)…` });
    try {
      const page = await rpc.getLogs({ address, fromBlock: start, toBlock: end, topics });
      logs.push(...page.filter((l) => !l.removed));
      start = end + 1;
    } catch (error) {
      if (error instanceof RpcError && chunk > 100 && /limit|range|too many|exceed|large/i.test(error.message)) {
        chunk = Math.floor(chunk / 2);
        continue;
      }
      throw error;
    }
  }
  return logs;
}

function decodeTransfers(logs: RpcLog[], timestamps: Map<number, number>): Transfer[] {
  const out: Transfer[] = [];
  for (const log of logs) {
    const blockNumber = hexToNumber(log.blockNumber);
    const timestamp = timestamps.get(blockNumber);
    if (timestamp === undefined) continue;
    const base = {
      timestamp,
      blockNumber,
      txHash: log.transactionHash,
      logIndex: hexToNumber(log.logIndex),
    };
    const topic0 = log.topics[0];
    if (topic0 === TOPIC_ERC721_TRANSFER && log.topics.length === 4) {
      out.push({
        ...base,
        standard: 'ERC-721',
        from: topicToAddress(log.topics[1]!),
        to: topicToAddress(log.topics[2]!),
        tokenId: hexToBigInt(log.topics[3]!).toString(),
        amount: '1',
      });
    } else if (topic0 === TOPIC_ERC1155_SINGLE && log.topics.length === 4) {
      const body = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
      out.push({
        ...base,
        standard: 'ERC-1155',
        from: topicToAddress(log.topics[2]!),
        to: topicToAddress(log.topics[3]!),
        tokenId: hexToBigInt('0x' + body.slice(0, 64)).toString(),
        amount: hexToBigInt('0x' + body.slice(64, 128)).toString(),
      });
    } else if (topic0 === TOPIC_ERC1155_BATCH && log.topics.length === 4) {
      const { ids, values } = decodeBatchData(log.data);
      ids.forEach((id, i) => {
        out.push({
          ...base,
          standard: 'ERC-1155',
          from: topicToAddress(log.topics[2]!),
          to: topicToAddress(log.topics[3]!),
          tokenId: id.toString(),
          amount: (values[i] ?? 1n).toString(),
        });
      });
    }
  }
  return out;
}
