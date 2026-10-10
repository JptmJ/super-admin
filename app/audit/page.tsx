import { redirect } from 'next/navigation';
import Link from 'next/link';
import { callBackend, readSession } from '@/lib/session';
import { readOperator, shellOperator } from '@/lib/operator';
import { Shell } from '@/components/Shell';
import type { TenantRow } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string; at: string; action: string; operator_name: string | null;
  operator_email: string | null; tenant_code: string | null; target_tenant_id: string | null;
  target_type: string | null; changes: Record<string, unknown> | null;
}

const TONE: Record<string, string> = {
  'tenant.create': 'active', 'tenant.update': 'purchased',
  'user.create': 'active', 'user.deactivate': 'suspended', 'user.activate': 'active',
  'user.update': 'purchased', 'user.role_change': 'purchased', 'user.password_reset': 'trial',
  'branch.create': 'active', 'module.entitlement': 'trial', 'flag.set': 'trial',
  'module.enable': 'active', 'module.disable': 'suspended',
  'tenant.demo_create': 'purchased', 'tenant.demo_delete': 'suspended',
  'platform.login': 'off',
};

/** The actions worth filtering by, rather than every string ever written. */
const ACTIONS = [
  'tenant.create', 'tenant.update', 'branch.create',
  'user.create', 'user.update', 'user.role_change', 'user.password_reset',
  'user.activate', 'user.deactivate',
  'module.entitlement', 'module.enable', 'module.disable', 'flag.set',
  'tenant.demo_create', 'tenant.demo_delete', 'platform.login',
];

const PAGE = 100;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; action?: string; offset?: string }>;
}) {
  if (!(await readSession())) redirect('/login');
  const params = await searchParams;
  const offset = Math.max(0, Number(params.offset ?? 0) || 0);

  const query = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (params.tenantId) query.set('tenantId', params.tenantId);
  if (params.action) query.set('action', params.action);

  const [operator, result, tenantsResult] = await Promise.all([
    readOperator(),
    callBackend<{ rows: AuditRow[] }>(`/api/platform/audit?${query}`),
    callBackend<{ rows: TenantRow[] }>('/api/platform/tenants?limit=200'),
  ]);

  if (result.status === 401) redirect('/login');
  const rows = result.data?.rows ?? [];
  const tenants = tenantsResult.data?.rows ?? [];

  /* Only a full page can have more behind it. */
  const hasMore = rows.length === PAGE;
  const pageLink = (nextOffset: number) => {
    const next = new URLSearchParams();
    if (params.tenantId) next.set('tenantId', params.tenantId);
    if (params.action) next.set('action', params.action);
    if (nextOffset > 0) next.set('offset', String(nextOffset));
    const qs = next.toString();
    return `/audit${qs ? `?${qs}` : ''}`;
  };

  return (
    <Shell operator={shellOperator(operator)}>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>
            Every action taken by a platform operator, newest first. This is the record a tenant can
            be shown when they ask who touched their data.
          </p>
        </div>
      </div>

      {result.error && <div className="alert error">{result.error.message}</div>}

      <form className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="tenantId">Business</label>
            <select id="tenantId" name="tenantId" defaultValue={params.tenantId ?? ''}>
              <option value="">All</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.display_name} ({t.code})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="action">Action</label>
            <select id="action" name="action" defaultValue={params.action ?? ''}>
              <option value="">All</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" type="submit">Filter</button>
          </div>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            {params.tenantId || params.action ? 'Nothing matches that filter.' : 'Nothing recorded yet.'}
          </div>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Operator</th><th>Action</th><th>Tenant</th><th>Details</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString('en-IN')}</td>
                    <td>{r.operator_name ?? '—'}<div className="faint">{r.operator_email}</div></td>
                    <td><span className={`pill ${TONE[r.action] ?? 'off'}`}>{r.action}</span></td>
                    <td>
                      {r.tenant_code
                        ? <Link href={`/tenants/${r.target_tenant_id}`}><code>{r.tenant_code}</code></Link>
                        : '—'}
                    </td>
                    <td className="faint mono" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.changes ? JSON.stringify(r.changes) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(offset > 0 || hasMore) && (
            <div className="row-actions" style={{ marginTop: 16, justifyContent: 'space-between' }}>
              {offset > 0
                ? <Link className="btn ghost sm" href={pageLink(Math.max(0, offset - PAGE))}>← Newer</Link>
                : <span />}
              <span className="faint">
                {offset + 1}–{offset + rows.length}
              </span>
              {hasMore
                ? <Link className="btn ghost sm" href={pageLink(offset + PAGE)}>Older →</Link>
                : <span />}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
