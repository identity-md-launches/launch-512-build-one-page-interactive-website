import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from './Icons';

interface Props {
  value: string;
  /** What is being copied, used in the accessible name: "Copy contract address". */
  label: string;
  className?: string;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ value, label, className }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await writeClipboard(value);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  const name = state === 'copied' ? `Copied ${label}` : state === 'failed' ? `Unable to copy ${label}` : `Copy ${label}`;

  return (
    <button
      type="button"
      className={['icon-button', className].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={name}
      title={name}
      data-copied={state === 'copied'}
    >
      <span className="icon-base">
        <CopyIcon />
      </span>
      <span className="icon-swap" data-active={state === 'copied'}>
        <CheckIcon />
      </span>
      <span className="visually-hidden" role="status">
        {state === 'copied' ? `${label} copied` : state === 'failed' ? `Unable to copy ${label}. Select the text to copy it.` : ''}
      </span>
    </button>
  );
}
