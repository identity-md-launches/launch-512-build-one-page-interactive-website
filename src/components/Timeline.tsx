import { useState } from 'react';
import type { Transfer } from '../lib/analyze';
import { ZERO_ADDRESS } from '../lib/abi';
import { formatCount, formatDateTime, formatIso, relativeTime, shortAddress, shortTokenId } from '../lib/format';
import { CopyButton } from './CopyButton';
import { ArrowRightIcon, ExternalIcon } from './Icons';

const PAGE = 25;

function Party({ role, address }: { role: 'From' | 'To'; address: string }) {
  if (address === ZERO_ADDRESS) {
    return (
      <span className="party">
        <span className="party-label">{role}</span>
        <span>{role === 'From' ? 'Mint' : 'Burn'}</span>
      </span>
    );
  }
  return (
    <span className="party">
      <span className="party-label">{role}</span>
      <span title={address}>{shortAddress(address)}</span>
      <CopyButton value={address} label={`${role.toLowerCase()} address ${shortAddress(address)}`} />
    </span>
  );
}

export function Timeline({ transfers, now }: { transfers: Transfer[]; now: number }) {
  const [limit, setLimit] = useState(PAGE);
  const visible = transfers.slice(0, limit);

  if (transfers.length === 0) {
    return (
      <div className="card empty-state">
        <p className="collection-name">No transfers in the last 24 hours</p>
        <p>The collection exists but nothing moved in this window. Try another collection or check back later.</p>
      </div>
    );
  }

  return (
    <>
      <ol className="timeline">
        {visible.map((t) => {
          const kind = t.from === ZERO_ADDRESS ? 'Mint' : t.to === ZERO_ADDRESS ? 'Burn' : 'Transfer';
          return (
            <li className="transfer" key={`${t.txHash}-${t.logIndex}-${t.tokenId}`}>
              <div className="transfer-token">
                <span className="transfer-kind" data-kind={kind}>
                  {kind}
                  {t.standard === 'ERC-1155' && t.amount !== '1' ? ` ×${t.amount}` : ''}
                </span>
                <span className="transfer-id" title={`Token #${t.tokenId}`}>
                  #{shortTokenId(t.tokenId)}
                </span>
              </div>
              <div className="transfer-parties">
                <Party role="From" address={t.from} />
                <span className="party-arrow" aria-hidden="true">
                  <ArrowRightIcon />
                </span>
                <Party role="To" address={t.to} />
              </div>
              <div className="transfer-time">
                <time dateTime={formatIso(t.timestamp)}>{formatDateTime(t.timestamp)}</time>
                <span>
                  {relativeTime(t.timestamp, now)} ·
                  <a href={`https://etherscan.io/tx/${t.txHash}`} target="_blank" rel="noreferrer">
                    Transaction
                    <span className="visually-hidden"> {t.txHash} on Etherscan (opens in a new tab)</span> <ExternalIcon />
                  </a>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="timeline-footer">
        <span>
          Showing {formatCount(visible.length)} of {formatCount(transfers.length)} transfers
        </span>
        {limit < transfers.length && (
          <button type="button" className="button button-secondary button-small" onClick={() => setLimit((l) => l + PAGE)}>
            Show {Math.min(PAGE, transfers.length - limit)} more
          </button>
        )}
      </div>
    </>
  );
}
