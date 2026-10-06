'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminApiError, api, type SupportSessionRow } from '@/lib/api';

export function SupportSessionList({ rows, canEnd }: { rows: SupportSessionRow[]; canEnd: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function end(session: SupportSessionRow) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/platform/support-sessions/${session.id}/end`);
      router.refresh();
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Could not close that session.');
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return <div className="empty">No support sessions recorded.</div>;
  }

  return (
    <>
      {error && <div className="alert error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Started</th><th>Business</th><th>Operator</th><th>Why</th>
              <th>Access</th><th className="num">Changes</th><th>State</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="faint" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(s.started_at).toLocaleString('en-IN')}
                </td>
                <td>
                  <Link href={`/tenants/${s.tenant_id}`}>{s.tenant_name}</Link>
                  <div className="faint"><code>{s.tenant_code}</code></div>
                </td>
                <td>{s.operator_name ?? '—'}<div className="faint">{s.operator_email}</div></td>
                <td style={{ maxWidth: 280 }}>{s.reason}</td>
                <td>
                  <span className={`pill ${s.can_write ? 'suspended' : 'off'}`}>
                    {s.can_write ? 'can write' : 'read-only'}
                  </span>
                </td>
                <td className="num">{s.action_count}</td>
                <td>
                  {s.is_open ? (
                    <span className="pill active">
                      open till {new Date(s.ends_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="pill off">{s.ended_at ? 'closed' : 'expired'}</span>
                  )}
                </td>
                <td className="row-actions">
                  {s.is_open && canEnd && (
                    <button className="btn danger sm" disabled={busy} onClick={() => end(s)}>
                      End now
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
