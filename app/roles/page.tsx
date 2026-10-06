import { redirect } from 'next/navigation';
import Link from 'next/link';
import { callBackend, readSession } from '@/lib/session';
import { readOperator, shellOperator } from '@/lib/operator';
import { Shell } from '@/components/Shell';
import type { PermissionTreeModule, PlatformRole, TenantRole } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  if (!(await readSession())) redirect('/login');

  const [operator, rolesResult, treeResult] = await Promise.all([
    readOperator(),
    callBackend<{ platform: PlatformRole; roleTypes: string[]; tenant: TenantRole[] }>('/api/platform/roles'),
    callBackend<{ modules: PermissionTreeModule[] }>('/api/platform/permission-tree'),
  ]);

  if (rolesResult.status === 401) redirect('/login');

  const platform = rolesResult.data?.platform;
  const tenant = rolesResult.data?.tenant ?? [];
  const tree = treeResult.data?.modules ?? [];
  const leafCount = tree.reduce(
    (n, m) => n + m.groups.reduce((g, grp) => g + grp.permissions.length, 0), 0);

  return (
    <Shell operator={shellOperator(operator)}>
      <div className="page-head">
        <div>
          <h1>Roles &amp; access</h1>
          <p>
            One platform operator, and three kinds of role inside a business. A staff role is named
            and given its permissions per business, from that business’s own Roles tab.
          </p>
        </div>
      </div>

      {rolesResult.error && <div className="alert error">{rolesResult.error.message}</div>}

      {platform && (
        <div className="card">
          <div className="card-head">
            <h2>The platform operator</h2>
            <span className="pill active">everything</span>
          </div>
          <p className="faint" style={{ margin: '0 0 10px' }}>{platform.description}</p>
          {operator && (
            <p style={{ margin: 0 }}>
              Signed in as <strong>{operator.full_name}</strong> — {operator.roleName}. There is one
              such account, seeded from the command line; no endpoint creates another.
            </p>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Role kinds</h2>
          <span className="faint">inside a jewellery business</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kind</th><th>What it is</th><th>Reach</th></tr></thead>
            <tbody>
              {tenant.map((r) => (
                <tr key={r.code}>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="faint"><code>{r.type}</code></div>
                    {r.isBranchAdmin && <span className="pill role">one per branch</span>}
                  </td>
                  <td style={{ maxWidth: 420 }}>{r.description}</td>
                  <td>
                    {r.permissions.includes('*') ? (
                      <span className="pill active">the whole business</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.permissions.map((p) => <code key={p} style={{ fontSize: 11 }}>{p}</code>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Staff</strong>
                  <div className="faint"><code>staff</code></div>
                </td>
                <td style={{ maxWidth: 420 }}>
                  Everyone else. Named per business and given exactly the permissions that shop’s
                  job needs — one shop’s Accountant handles billing, another’s handles billing and
                  tagging, and both are called Accountant.
                </td>
                <td className="faint">
                  Whatever you tick. Open a tenant and use its <strong>Roles</strong> tab.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>What a staff role can be given</h2>
          <span className="faint">{tree.length} modules · {leafCount} permissions</span>
        </div>
        <p className="faint" style={{ margin: '0 0 14px' }}>
          Built from the live routes, so it cannot offer a switch the API does not enforce. Tick a
          whole module, an area within it, or single actions.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Module</th><th>Areas</th></tr></thead>
            <tbody>
              {tree.map((m) => (
                <tr key={m.key}>
                  <td>
                    <strong>{m.name}</strong>
                    <div className="faint"><code>{m.wildcard}</code></div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {m.groups.map((g) => (
                        <span className="pill off" key={g.key}>
                          {g.name} · {g.permissions.map((p) => p.action).join(', ')}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <p className="faint" style={{ margin: 0 }}>
          A business cannot create a role, edit one, or put anyone into one — those endpoints do not
          exist. The one change a shop may make to its own people is switching an account off.{' '}
          <Link href="/tenants">Open a tenant</Link> to manage its roles and staff.
        </p>
      </div>
    </Shell>
  );
}
