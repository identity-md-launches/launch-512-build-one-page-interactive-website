import { useId, useRef, useState, type FormEvent } from 'react';
import { isAddress } from '../lib/abi';
import { AlertIcon } from './Icons';

export const EXAMPLES: { name: string; address: string }[] = [
  { name: 'Pudgy Penguins', address: '0xBd3531dA5CF5857e7CfAA92426877b022e612cf8' },
  { name: 'Bored Ape Yacht Club', address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' },
  { name: 'Azuki', address: '0xED5AF388653567Af2F388E6224dC7C4b3241C544' },
  { name: 'Milady Maker', address: '0x5Af0D9827E0c53E4799BB226655A1de152A425a5' },
];

interface Props {
  initialValue: string;
  busy: boolean;
  onSubmit: (address: string) => void;
}

export function SearchForm({ initialValue, busy, onSubmit }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const submit = (candidate: string) => {
    const trimmed = candidate.trim();
    if (trimmed === '') {
      setError('Enter a collection contract address to analyze.');
      inputRef.current?.focus();
      return;
    }
    if (!isAddress(trimmed)) {
      setError('Use a 42-character Ethereum address that starts with 0x, for example 0xBd35…2cf8.');
      inputRef.current?.focus();
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    submit(value);
  };

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate>
      <label className="field-label" htmlFor={inputId}>
        Collection contract address
      </label>
      <div className="search-row">
        <input
          ref={inputRef}
          id={inputId}
          className="text-input"
          name="collection"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="0x…"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          aria-invalid={error ? 'true' : undefined}
          maxLength={64}
        />
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy && <span className="spinner" aria-hidden="true" />}
          Analyze collection
        </button>
      </div>
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          <AlertIcon />
          <span>{error}</span>
        </p>
      ) : (
        <p className="field-hint" id={hintId}>
          Ethereum mainnet ERC-721 or ERC-1155 contract. Read-only, no wallet needed.
        </p>
      )}
      {error && (
        <p className="field-hint visually-hidden" id={hintId}>
          Ethereum mainnet ERC-721 or ERC-1155 contract.
        </p>
      )}
      <div className="examples">
        <span id={`${inputId}-examples`}>Try a collection:</span>
        <ul aria-labelledby={`${inputId}-examples`}>
          {EXAMPLES.map((example) => (
            <li key={example.address}>
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => {
                  setValue(example.address);
                  setError(null);
                  submit(example.address);
                }}
              >
                {example.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
