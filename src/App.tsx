import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CollectionHeader } from './components/CollectionHeader';
import { HourlyChart } from './components/HourlyChart';
import { AlertIcon } from './components/Icons';
import { PulseMeter } from './components/PulseMeter';
import { SearchForm } from './components/SearchForm';
import { Settings } from './components/Settings';
import { DashboardSkeleton } from './components/Skeleton';
import { StatTiles } from './components/StatTiles';
import { Timeline } from './components/Timeline';
import { isAddress } from './lib/abi';
import { analyze, type PulseMetrics } from './lib/analyze';
import { CollectionError, scanCollection, type Progress, type ScanResult } from './lib/collection';
import { DEFAULT_RPC_URL, RpcClient } from './lib/rpc';

type State =
  | { status: 'idle' }
  | { status: 'loading'; address: string; progress: Progress }
  | { status: 'error'; address: string; title: string; message: string }
  | { status: 'ready'; address: string; result: ScanResult; metrics: PulseMetrics; scannedAt: number };

const RPC_STORAGE_KEY = 'nft-pulse.rpc-url';

function readHashAddress(): string {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  return isAddress(raw) ? raw : '';
}

function readStoredRpc(): string {
  try {
    const stored = window.localStorage.getItem(RPC_STORAGE_KEY);
    return stored && /^https:\/\//.test(stored) ? stored : DEFAULT_RPC_URL;
  } catch {
    return DEFAULT_RPC_URL;
  }
}

export default function App() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [rpcUrl, setRpcUrl] = useState(readStoredRpc);
  const initialAddress = useMemo(readHashAddress, []);
  /** Seed for the form; changes only when the URL hash brings a new address. */
  const [formSeed, setFormSeed] = useState(initialAddress);
  const abortRef = useRef<AbortController | null>(null);
  const currentAddress = useRef<string>('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const run = useCallback(
    async (address: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      currentAddress.current = address.toLowerCase();
      if (readHashAddress().toLowerCase() !== currentAddress.current) window.location.hash = `/${address}`;
      setState({ status: 'loading', address, progress: { phase: 'contract', detail: 'Checking the contract…' } });
      try {
        const rpc = new RpcClient(rpcUrl, controller.signal);
        const result = await scanCollection(address, rpc, (progress) => {
          if (!controller.signal.aborted) setState({ status: 'loading', address, progress });
        });
        if (controller.signal.aborted) return;
        setState({
          status: 'ready',
          address,
          result,
          metrics: analyze(result.transfers, result.windowEnd),
          scannedAt: Math.floor(Date.now() / 1000),
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof CollectionError) {
          setState({
            status: 'error',
            address,
            title: error.kind === 'not-a-contract' ? 'No contract at this address' : 'Not an NFT collection',
            message: error.message,
          });
        } else {
          setState({
            status: 'error',
            address,
            title: 'Unable to load collection activity',
            message: `${error instanceof Error ? error.message : 'Unexpected error.'} You can retry, or change the data source at the bottom of the page.`,
          });
        }
      }
    },
    [rpcUrl],
  );

  useEffect(() => {
    if (initialAddress) void run(initialAddress);
    // Only on first mount: later runs come from the form or the hash listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep links and browser back/forward: a new #/0x… hash starts a scan.
  useEffect(() => {
    const onHashChange = () => {
      const address = readHashAddress();
      if (address && address.toLowerCase() !== currentAddress.current) {
        setFormSeed(address);
        void run(address);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [run]);

  useEffect(() => {
    if (state.status === 'ready' || state.status === 'error') {
      resultsRef.current?.focus({ preventScroll: true });
    }
  }, [state.status]);

  const changeRpc = (url: string) => {
    setRpcUrl(url);
    try {
      window.localStorage.setItem(RPC_STORAGE_KEY, url);
    } catch {
      // storage unavailable: keep it in memory only
    }
  };

  const busy = state.status === 'loading';

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="page">
        <header className="site-header">
          <a className="brand" href="#/" aria-label="NFT Pulse home">
            <span className="brand-mark" aria-hidden="true" />
            NFT Pulse
          </a>
          <span className="header-meta">Ethereum mainnet · last 24 hours</span>
        </header>

        <main id="main" tabIndex={-1}>
          <div className="hero">
            <h1>Feel a collection’s pulse</h1>
            <p>Paste an NFT contract address to turn its last 24 hours of transfers into a live activity monitor.</p>
          </div>

          <div className="card">
            <SearchForm key={formSeed} initialValue={formSeed} busy={busy} onSubmit={(address) => void run(address)} />
          </div>

          <p className="status-line" role="status" aria-live="polite">
            {state.status === 'loading' && (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>{state.progress.detail}</span>
              </>
            )}
            {state.status === 'ready' && `Loaded ${state.result.transfers.length} transfers for ${state.result.info.name ?? state.address}.`}
          </p>

          <div ref={resultsRef} tabIndex={-1} style={{ outline: 'none' }}>
            {state.status === 'error' && (
              <div className="alert" role="alert">
                <AlertIcon />
                <div>
                  <p className="alert-title">{state.title}</p>
                  <p>{state.message}</p>
                </div>
              </div>
            )}

            {state.status === 'loading' && <DashboardSkeleton />}

            {state.status === 'ready' && (
              <>
                <section className="section" aria-labelledby="overview-heading">
                  <h2 className="visually-hidden" id="overview-heading">
                    Overview
                  </h2>
                  <div className="card enter">
                    <CollectionHeader result={state.result} />
                  </div>
                  <div className="pulse-grid">
                    <PulseMeter metrics={state.metrics} />
                    <StatTiles metrics={state.metrics} />
                  </div>
                  <HourlyChart hourly={state.metrics.hourly} peakStart={state.metrics.mostActiveHour?.start ?? null} />
                </section>

                <section className="section" aria-labelledby="timeline-heading">
                  <div className="section-heading">
                    <h2 id="timeline-heading">Recent transfers</h2>
                    <p>Newest first. Times shown in your local time zone.</p>
                  </div>
                  <Timeline transfers={state.result.transfers} now={state.scannedAt} />
                </section>
              </>
            )}
          </div>
        </main>

        <footer className="site-footer">
          <Settings rpcUrl={rpcUrl} onChange={changeRpc} />
          <p>
            NFT Pulse reads public on-chain events only. It never asks for a wallet connection, a private key or a
            signature. Activity levels are based on transfers per hour in the most recent six hours.
          </p>
        </footer>
      </div>
    </>
  );
}
