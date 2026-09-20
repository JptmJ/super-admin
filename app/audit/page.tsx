import { redirect } from 'next/navigation';
import { callBackend, readSession } from '@/lib/session';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string; at: string; action: string; operator_name: string | null;
  operator_email: string | null; tenant_code: string | null;
  target_type: string | null; changes: Record<string, unknown> | null;
}

const TONE: Record<string, string> = {
  'tenant.create': 'active', 'tenant.update': 'purchased',
  'user.create': 'active', 'user.deactivate': 'suspended',
  'branch.create': 'active', 'module.entitlement': 'trial',
  'support.session_start': 'trial', 'platform.login': 'off',
};

export default async function AuditPage() {
  if (!(await readSession())) redirect('/login');
  const result = await callBackend<{ rows: AuditRow[] }>('/api/platform/audit?limit=100');
  if (result.status === 401) redirect('/login');
  const rows = result.data?.rows ?? [];

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>Every action taken by a platform operator, newest first. This is the record a tenant can be shown when they ask who touched their data.</p>
        </div>
      </div>

      {result.error && <div className="alert error">{result.error.message}</div>}

      {rows.length === 0 ? (
        <div className="card"><div className="empty">Nothing recorded yet.</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Operator</th><th>Action</th><th>Tenant</th><th>Details</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString('en-IN')}</td>
                  <td>{r.operator_name ?? '—'}<div className="faint">{r.operator_email}</div></td>
                  <td><span className={`pill ${TONE[r.action] ?? 'off'}`}>{r.action}</span></td>
                  <td>{r.tenant_code ? <code>{r.tenant_code}</code> : '—'}</td>
                  <td className="faint mono" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.changes ? JSON.stringify(r.changes) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
