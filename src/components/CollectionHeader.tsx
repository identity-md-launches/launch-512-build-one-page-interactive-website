import type { ScanResult } from '../lib/collection';
import { formatDateTime, formatExact, shortAddress } from '../lib/format';
import { CopyButton } from './CopyButton';
import { ExternalIcon } from './Icons';

export function CollectionHeader({ result }: { result: ScanResult }) {
  const { info } = result;
  const title = info.name ?? 'Unnamed collection';
  return (
    <div className="collection-header">
      <div>
        <h2 className="collection-name">{title}</h2>
        <div className="collection-meta">
          {info.symbol && <span className="badge">{info.symbol}</span>}
          <span className="badge">{info.standard === 'unknown' ? 'NFT contract' : info.standard}</span>
          <span className="address-row">
            <code>
              <span className="address-full">{info.address}</span>
              <span className="address-short" aria-hidden="true">
                {shortAddress(info.address)}
              </span>
            </code>
            <CopyButton value={info.address} label="contract address" />
            <a
              className="icon-button"
              href={`https://etherscan.io/address/${info.address}`}
              target="_blank"
              rel="noreferrer"
              aria-label="View contract on Etherscan (opens in a new tab)"
              title="View contract on Etherscan"
            >
              <ExternalIcon />
            </a>
          </span>
        </div>
      </div>
      <p className="window-note">
        Blocks {formatExact(result.fromBlock)}–{formatExact(result.toBlock)}, ending {formatDateTime(result.windowEnd)}.
        {result.truncated && ' Only the newest 4,000 transfers were analyzed.'}
      </p>
    </div>
  );
}
