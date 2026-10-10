'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { AdminApiError, api, type DemoAccount, type DemoJob, type Operator } from '@/lib/api';

/** The job being watched, so a reload or a trip to another page picks it up again. Holds no password. */
const JOB_KEY = 'sw_demo_job';
const MAX = 20;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');

/** One and many, for the counts under each demo. */
const LABELS: Record<string, [string, string]> = {
  customers: ['customer', 'customers'], suppliers: ['supplier', 'suppliers'], items: ['item', 'items'],
  pieces_in_stock: ['piece in stock', 'pieces in stock'], invoices: ['bill', 'bills'], purchases: ['purchase', 'purchases'],
  orders: ['order', 'orders'], old_gold: ['old gold intake', 'old gold intakes'], scheme_members: ['scheme member', 'scheme members'],
  girvi_loans: ['girvi loan', 'girvi loans'], vouchers: ['voucher', 'vouchers'],
};
const label = (key: string, n: number) => LABELS[key]?.[n === 1 ? 0 : 1] ?? key.replace(/_/g, ' ');

const remember = (id: string | null) => {
  try { if (id) sessionStorage.setItem(JOB_KEY, id); else sessionStorage.removeItem(JOB_KEY); } catch { /* private window */ }
};
const recall = (): string | null => {
  try { return sessionStorage.getItem(JOB_KEY); } catch { return null; }
};

function elapsed(from: string, to: string | null): string {
  const s = Math.max(0, Math.round(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

/** Every login of every demo, one line each, ready to paste into a message. */
function asText(accounts: DemoAccount[]): string {
  return accounts.map((a) => [
    `${a.displayName} (${a.city})`,
    `Tenant code: ${a.code}`,
    `Password (all logins): ${a.password}`,
    ...(appUrl ? [`Sign in at: ${appUrl}`] : []),
    ...a.logins.map((l) => `  ${l.roleName} · ${l.branch} · ${l.fullName} · ${l.email}`),
  ].join('\n')).join('\n\n');
}

function downloadCsv(accounts: DemoAccount[]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    ['Business', 'City', 'Tenant code', 'Name', 'Role', 'Branch', 'Email', 'Password'],
    ...accounts.flatMap((a) => a.logins.map((l) => [a.displayName, a.city, a.code, l.fullName, l.roleName, l.branch, l.email, a.password])),
  ];
  const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `demo-logins-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DemoAccountsPage() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [count, setCount] = useState(1);
  const [job, setJob] = useState<DemoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    api.get<Operator>('/platform/me').then(setOperator).catch(() => undefined);
    const saved = recall();
    if (saved) {
      api.get<DemoJob>(`/platform/demo-tenants/jobs/${saved}`)
        .then(setJob)
        .catch(() => remember(null)); // forgotten by the server, or over an hour old
    }
  }, []);

  /*
   * Poll while the job runs — each request only after the last one answered,
   * so a busy server is not buried under a queue of them. A second timer keeps
   * the clock moving in between.
   */
  const running = job !== null && job.status !== 'done';
  useEffect(() => {
    if (!running || !job) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await api.get<DemoJob>(`/platform/demo-tenants/jobs/${job.id}`);
        if (alive) { setJob(next); setError(null); }
      } catch (e) {
        if (!alive) return;
        if (e instanceof AdminApiError && e.status === 404) {
          remember(null);
          setError('The server no longer has this job — it may have restarted. Check Tenants for the demos it made.');
          return;
        }
        setError(e instanceof AdminApiError ? e.message : 'Cannot reach the server. Still trying…');
      }
      if (alive) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => { alive = false; clearTimeout(timer); clearInterval(clock); };
  }, [running, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function stop() {
    if (!job) return;
    try {
      setJob(await api.post<DemoJob>(`/platform/demo-tenants/jobs/${job.id}/stop`));
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Something went wrong.');
    }
  }

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const started = await api.post<DemoJob>('/platform/demo-tenants', { count });
      remember(started.id);
      setJob(started);
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {
      setError('The browser would not let this page copy. Select the text and copy it instead.');
    }
  }, []);

  const reset = () => { remember(null); setJob(null); setError(null); };
  const finished = job ? job.accounts.length + job.failures.length : 0;

  return (
    <Shell operator={operator ? { fullName: operator.full_name, roleName: operator.roleName } : undefined}>
      <div className="page-head">
        <div>
          <h1>Demo accounts</h1>
          <p>
            Ready-made jewellery businesses full of sample data, for showing the product. Say how many — each
            one gets its own branches, staff roles with random permissions, logins and a password.
          </p>
        </div>
        <Link className="btn ghost" href="/tenants">Back</Link>
      </div>

      {error && <div className="alert error">{error}</div>}

      {!job && (
        <form className="card" onSubmit={start}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="count">How many demo accounts<span className="req">*</span>
                <span className="hint">1 to {MAX}. They are made one after another.</span>
              </label>
              <input
                id="count" type="number" min={1} max={MAX} required value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(MAX, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <button className="btn gold" type="submit" disabled={busy}>
                {busy ? <><span className="spinner" /> Starting…</> : `Create ${count} demo account${count === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>

          <h3 style={{ margin: '20px 0 6px' }}>Each demo account comes with</h3>
          <ul className="demo-list">
            <li>A business in one Indian city, with <strong>1 to 3 branches</strong> and a branch admin for each (sometimes one admin covering them all).</li>
            <li><strong>2 to 4 staff roles</strong> — Cashier, Storekeeper, Accountant and the like — each with its own random set of permissions, and 1 or 2 staff per branch.</li>
            <li>Masters: metal rates with history, items, making and wastage formulas, customers, suppliers, karigars and two savings plans.</li>
            <li>Activity in every module: purchases, tagged stock, bills, receipts, an approval memo, orders, old gold, scheme members with their collections, girvi loans and expenses — all posted to the books.</li>
            <li>A tenant code like <code>demo-1a2b3</code>, emails at <code>@&lt;code&gt;.test</code>, and <strong>one password for every login</strong>. Nobody is asked to change it at first sign-in.</li>
          </ul>
          <p className="faint" style={{ margin: '10px 0 0' }}>
            Each takes from a few seconds to a couple of minutes. The passwords are shown here once and kept for
            an hour — copy or download them. A demo can be deleted from its tenant page when it is no longer needed.
          </p>
        </form>
      )}

      {job && (
        <div className="card">
          <div className="card-head">
            <h2>
              {running
                ? `Making demo ${Math.min(finished + 1, job.count)} of ${job.count}`
                : job.stopped
                  ? `Stopped — ${job.accounts.length} demo account${job.accounts.length === 1 ? '' : 's'} ready`
                  : `${job.accounts.length} of ${job.count} demo account${job.count === 1 ? '' : 's'} ready`}
            </h2>
            <div className="row-actions" style={{ alignItems: 'center' }}>
              <span className="faint">{elapsed(job.startedAt, job.finishedAt)}</span>
              {running && (
                <button className="btn ghost sm" onClick={stop} disabled={job.stopped}>
                  {job.stopped ? 'Stopping after this one…' : 'Stop after this one'}
                </button>
              )}
            </div>
          </div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={job.count} aria-valuenow={finished}>
            <span style={{ width: `${Math.max(running ? 3 : 0, (finished / job.count) * 100)}%` }} />
          </div>
          {running && (
            <p className="muted" style={{ margin: '10px 0 0' }}>
              <span className="spinner" /> {job.current?.step ?? 'Waiting for the demo before it to finish'}…
              <span className="faint" style={{ display: 'block', marginTop: 4 }}>
                You can leave this page. Come back within the hour and it picks up where it is.
              </span>
            </p>
          )}
          {!running && (
            <div className="row-actions" style={{ marginTop: 14 }}>
              {job.accounts.length > 0 && (
                <>
                  <button className="btn primary sm" onClick={() => downloadCsv(job.accounts)}>Download CSV</button>
                  <button className="btn ghost sm" onClick={() => copy('all', asText(job.accounts))}>
                    {copied === 'all' ? 'Copied' : 'Copy all logins'}
                  </button>
                </>
              )}
              <button className="btn gold sm" onClick={reset}>Make more</button>
            </div>
          )}
        </div>
      )}

      {job?.failures.map((f) => (
        <div key={f.index} className="alert error" style={{ marginTop: 16 }}>
          Demo {f.index} could not be made, and nothing of it was kept: {f.message}
        </div>
      ))}

      {job?.accounts.map((a) => (
        <div className="card" key={a.tenantId}>
          <div className="card-head">
            <div>
              <h2 className="demo-title">
                <Link href={`/tenants/${a.tenantId}`}>{a.displayName}</Link>{' '}
                <span className="pill demo">Demo</span>
              </h2>
              <div className="faint">{a.legalName} · {a.city} · {a.kind} · made in {a.seconds}s</div>
            </div>
            <button className="btn ghost sm" onClick={() => copy(a.tenantId, asText([a]))}>
              {copied === a.tenantId ? 'Copied' : 'Copy logins'}
            </button>
          </div>

          <div className="demo-keys">
            <div><span>Tenant code</span><code>{a.code}</code></div>
            <div><span>Password for every login</span><code>{a.password}</code></div>
            {appUrl && <div><span>Sign in at</span><a href={appUrl} target="_blank" rel="noreferrer">{appUrl.replace(/^https?:\/\//, '')}</a></div>}
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Branch</th><th>Email</th></tr></thead>
              <tbody>
                {a.logins.map((l) => (
                  <tr key={l.email}>
                    <td>{l.fullName}</td>
                    <td><span className="pill role">{l.roleName}</span></td>
                    <td className="muted">{l.branch}</td>
                    <td className="mono">{l.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="demo-roles">
            <summary>
              Staff roles: {a.roles.map((r) => `${r.name} (${r.permissions.length})`).join(', ')}
            </summary>
            {a.roles.map((r) => (
              <div key={r.name} className="demo-role">
                <strong>{r.name}</strong>
                <div className="chips">{r.permissions.map((p) => <code key={p}>{p}</code>)}</div>
              </div>
            ))}
          </details>

          <div className="chips" style={{ marginTop: 12 }}>
            {Object.entries(a.data).map(([k, v]) => <span key={k} className="chip"><b>{v}</b> {label(k, v)}</span>)}
          </div>

          {a.warnings.length > 0 && (
            <div className="alert info" style={{ margin: '12px 0 0' }}>
              Some sample data was skipped; the demo works without it.
              <ul>{a.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
        </div>
      ))}
    </Shell>
  );
}
