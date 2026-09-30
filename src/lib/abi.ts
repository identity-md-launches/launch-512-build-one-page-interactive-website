// Hand-rolled ABI helpers for the two NFT transfer event shapes and the two
// read-only calls the dashboard needs. Keeping this local avoids pulling a
// wallet or contract library into a static site.

import { hexToBigInt } from './rpc';

/** keccak256("Transfer(address,address,uint256)") */
export const TOPIC_ERC721_TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
/** keccak256("TransferSingle(address,address,address,uint256,uint256)") */
export const TOPIC_ERC1155_SINGLE = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
/** keccak256("TransferBatch(address,address,address,uint256[],uint256[])") */
export const TOPIC_ERC1155_BATCH = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb';

/** name() selector */
export const SELECTOR_NAME = '0x06fdde03';
/** symbol() selector */
export const SELECTOR_SYMBOL = '0x95d89b41';
/** supportsInterface(bytes4) selector */
export const SELECTOR_SUPPORTS_INTERFACE = '0x01ffc9a7';
export const INTERFACE_ERC721 = '80ac58cd';
export const INTERFACE_ERC1155 = 'd9b67a26';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/** Lower-cases an address; checksum casing is not required for RPC queries. */
export function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

export function topicToAddress(topic: string): string {
  return '0x' + topic.slice(-40).toLowerCase();
}

export function encodeSupportsInterface(interfaceId: string): string {
  return SELECTOR_SUPPORTS_INTERFACE + interfaceId.padEnd(64, '0');
}

/** Decodes a single ABI-encoded string return value; returns null when malformed. */
export function decodeString(hex: string): string | null {
  const body = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (body.length < 128) {
    // Some legacy contracts return a bytes32 instead of a string.
    if (body.length === 64) return bytesToUtf8(body).replace(/\0+$/, '') || null;
    return null;
  }
  const offset = Number(BigInt('0x' + body.slice(0, 64))) * 2;
  const length = Number(BigInt('0x' + body.slice(offset, offset + 64))) * 2;
  const data = body.slice(offset + 64, offset + 64 + length);
  if (data.length !== length) return null;
  const text = bytesToUtf8(data).trim();
  return text.length > 0 ? text : null;
}

function bytesToUtf8(hexBody: string): string {
  const bytes = new Uint8Array(hexBody.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hexBody.slice(i * 2, i * 2 + 2), 16);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return '';
  }
}

export function decodeBool(hex: string): boolean {
  return /^0x0*1$/.test(hex);
}

/** Splits the data section of a log into 32-byte words. */
export function dataWords(data: string): string[] {
  const body = data.startsWith('0x') ? data.slice(2) : data;
  const words: string[] = [];
  for (let i = 0; i + 64 <= body.length; i += 64) words.push('0x' + body.slice(i, i + 64));
  return words;
}

/** Decodes TransferBatch(ids[], values[]) data; returns the token ids and their amounts. */
export function decodeBatchData(data: string): { ids: bigint[]; values: bigint[] } {
  const words = dataWords(data);
  const idsOffset = Number(hexToBigInt(words[0] ?? '0x0')) / 32;
  const valuesOffset = Number(hexToBigInt(words[1] ?? '0x0')) / 32;
  const readArray = (start: number): bigint[] => {
    const length = Number(hexToBigInt(words[start] ?? '0x0'));
    const out: bigint[] = [];
    for (let i = 0; i < length; i++) out.push(hexToBigInt(words[start + 1 + i] ?? '0x0'));
    return out;
  };
  return { ids: readArray(idsOffset), values: readArray(valuesOffset) };
}
