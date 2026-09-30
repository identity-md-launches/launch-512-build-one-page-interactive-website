import { useId, useState, type FormEvent } from 'react';
import { DEFAULT_RPC_URL } from '../lib/rpc';

interface Props {
  rpcUrl: string;
  onChange: (url: string) => void;
}

/** Optional RPC endpoint override. Public endpoints only; never a key or secret. */
export function Settings({ rpcUrl, onChange }: Props) {
  const [draft, setDraft] = useState(rpcUrl);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const save = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!/^https:\/\/\S+$/.test(trimmed)) {
      setError('Enter an https:// JSON-RPC URL, for example https://ethereum-rpc.publicnode.com.');
      return;
    }
    setError(null);
    onChange(trimmed);
  };

  return (
    <details className="settings">
      <summary>Data source</summary>
      <form className="settings-body" onSubmit={save}>
        <p>
          Transfers are read straight from a public Ethereum JSON-RPC endpoint in your browser. You can point the
          site at another mainnet endpoint. Never paste a URL that contains a private key.
        </p>
        <label className="field-label" htmlFor={inputId}>
          JSON-RPC endpoint
        </label>
        <input
          id={inputId}
          className="text-input"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
        />
        {error && (
          <p className="field-error" id={errorId} role="alert">
            {error}
          </p>
        )}
        <div className="settings-actions">
          <button type="submit" className="button button-secondary button-small">
            Save endpoint
          </button>
          {rpcUrl !== DEFAULT_RPC_URL && (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => {
                setDraft(DEFAULT_RPC_URL);
                setError(null);
                onChange(DEFAULT_RPC_URL);
              }}
            >
              Reset to default
            </button>
          )}
        </div>
      </form>
    </details>
  );
}
