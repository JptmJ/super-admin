import { redirect } from 'next/navigation';
import Link from 'next/link';
import { callBackend, readSession } from '@/lib/session';
import { Shell } from '@/components/Shell';
import type { TenantRow } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  if (!(await readSession())) redirect('/login');
  const params = await searchParams;

  const query = new URLSearchParams({ limit: '100' });
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const result = await callBackend<{ rows: TenantRow[]; total: number }>(`/api/platform/tenants?${query}`);
  if (result.status === 401) redirect('/login');
  const rows = result.data?.rows ?? [];

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Tenants</h1>
          <p>{result.data?.total ?? 0} businesses on the platform.</p>
        </div>
        <Link className="btn gold" href="/tenants/new">+ New tenant</Link>
      </div>

      <form className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="search">Search</label>
            <input id="search" name="search" defaultValue={params.search ?? ''} placeholder="Code or name" />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={params.status ?? ''}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" type="submit">Filter</button>
          </div>
        </div>
      </form>

      {result.error && <div className="alert error">{result.error.message}</div>}

      {rows.length === 0 ? (
        <div className="card"><div className="empty">No tenants match.</div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th><th>Code</th><th>Type</th><th>Status</th><th>GSTIN</th>
                <th>Admin</th><th className="num">Branches</th><th className="num">Staff</th><th className="num">Modules</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td><Link href={`/tenants/${t.id}`}>{t.display_name}</Link>
                    <div className="faint">{t.legal_name}</div></td>
                  <td><code>{t.code}</code></td>
                  <td className="muted">{t.kind}</td>
                  <td><span className={`pill ${t.status}`}>{t.status}</span></td>
                  <td className="mono faint">{t.gstin ?? '—'}</td>
                  <td className="muted">{t.admin_email ?? '—'}</td>
                  <td className="num">{t.branch_count}</td>
                  <td className="num">{t.user_count}</td>
                  <td className="num">{t.module_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
