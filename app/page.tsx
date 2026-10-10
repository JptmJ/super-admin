import { redirect } from 'next/navigation';
import { callBackend, readSession } from '@/lib/session';
import { readOperator, shellOperator } from '@/lib/operator';
import { Shell } from '@/components/Shell';
import Link from 'next/link';
import type { PlatformStats, TenantRow } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  if (!(await readSession())) redirect('/login');

  const [operator, statsResult, tenantsResult] = await Promise.all([
    readOperator(),
    callBackend<PlatformStats>('/api/platform/stats'),
    callBackend<{ rows: TenantRow[] }>('/api/platform/tenants?limit=8'),
  ]);

  // An expired or invalid session reads as unauthorized — send them to sign in
  // again rather than rendering an empty console.
  if (statsResult.status === 401) redirect('/login');

  const stats = statsResult.data;
  const tenants = tenantsResult.data?.rows ?? [];

  return (
    <Shell operator={shellOperator(operator)}>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Every business on the platform, and the operators who look after them.</p>
        </div>
        <div className="row-actions">
          <Link className="btn ghost" href="/tenants/demo">+ Demo accounts</Link>
          <Link className="btn gold" href="/tenants/new">+ New tenant</Link>
        </div>
      </div>

      {statsResult.error && <div className="alert error">{statsResult.error.message}</div>}

      {stats && (
        <div className="stats">
          <div className="stat accent"><b className="num">{stats.tenants.total}</b><span>Tenants</span></div>
          <div className="stat"><b className="num">{stats.tenants.active}</b><span>Active</span></div>
          <div className="stat"><b className="num">{stats.tenants.trial}</b><span>On trial</span></div>
          <div className="stat"><b className="num">{stats.tenants.suspended}</b><span>Suspended</span></div>
          <div className="stat"><b className="num">{stats.branches}</b><span>Branches</span></div>
          <div className="stat"><b className="num">{stats.users}</b><span>Staff accounts</span></div>
          <div className="stat"><b className="num">{stats.operators}</b><span>Operators</span></div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Recent tenants</h2>
          <Link className="btn ghost sm" href="/tenants">View all</Link>
        </div>

        {tenants.length === 0 ? (
          <div className="empty">
            No tenants yet. <Link href="/tenants/new">Create the first one.</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Business</th><th>Code</th><th>Type</th><th>Status</th>
                  <th>Admin</th><th className="num">Branches</th><th className="num">Staff</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/tenants/${t.id}`}>{t.display_name}</Link>
                      {t.is_demo && <> <span className="pill demo">Demo</span></>}</td>
                    <td><code>{t.code}</code></td>
                    <td className="muted">{t.kind}</td>
                    <td><span className={`pill ${t.status}`}>{t.status}</span></td>
                    <td className="muted">{t.admin_email ?? '—'}</td>
                    <td className="num">{t.branch_count}</td>
                    <td className="num">{t.user_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
