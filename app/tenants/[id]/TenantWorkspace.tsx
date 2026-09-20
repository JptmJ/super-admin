'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminApiError, api, type BranchRow, type ModuleRow, type TenantRole, type UserRow } from '@/lib/api';

interface Detail {
  tenant: Record<string, string | null>;
  branches: BranchRow[];
  users: UserRow[];
  modules: ModuleRow[];
  /** The admin covering every branch, if the business has one. */
  globalAdmin: UserRow | null;
}

type Tab = 'users' | 'branches' | 'modules' | 'settings';

export function TenantWorkspace({
  tenantId, detail, roles,
}: {
  tenantId: string; detail: Detail; roles: TenantRole[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const tenant = detail.tenant;

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setBanner(null);
    try {
      await action();
      setBanner({ kind: 'ok', text: success });
      router.refresh();
    } catch (e) {
      setBanner({ kind: 'error', text: e instanceof AdminApiError ? e.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{tenant.display_name}</h1>
          <p>
            <code>{tenant.code}</code> · {tenant.kind} ·{' '}
            <span className={`pill ${tenant.status}`}>{tenant.status}</span>
            {tenant.gstin && <> · <span className="mono faint">{tenant.gstin}</span></>}
          </p>
        </div>
        <Link className="btn ghost" href="/tenants">Back</Link>
      </div>

      {banner && <div className={`alert ${banner.kind}`}>{banner.text}</div>}

      <div className="tabs">
        {(['users', 'branches', 'modules', 'settings'] as Tab[]).map((t) => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'users' && `Staff (${detail.users.length})`}
            {t === 'branches' && `Branches (${detail.branches.length})`}
            {t === 'modules' && `Modules (${detail.modules.length})`}
            {t === 'settings' && 'Settings'}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab tenantId={tenantId} users={detail.users} branches={detail.branches} roles={roles} globalAdmin={detail.globalAdmin} run={run} busy={busy} />}
      {tab === 'branches' && <BranchesTab tenantId={tenantId} branches={detail.branches} run={run} busy={busy} />}
      {tab === 'modules' && <ModulesTab tenantId={tenantId} modules={detail.modules} run={run} busy={busy} />}
      {tab === 'settings' && <SettingsTab tenantId={tenantId} tenant={tenant} run={run} busy={busy} />}
    </>
  );
}

type Runner = (action: () => Promise<unknown>, success: string) => Promise<void>;

/* ------------------------------------------------------------- staff */

function UsersTab({
  tenantId, users, branches, roles, globalAdmin, run, busy,
}: {
  tenantId: string; users: UserRow[]; branches: BranchRow[]; roles: TenantRole[];
  globalAdmin: UserRow | null; run: Runner; busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('sales');

  const adminRole = roles.find((r) => r.isBranchAdmin);
  const creatingAdmin = adminRole ? role === adminRole.code : false;

  /* Which branches still have no admin — the only ones a new admin can take. */
  const branchesWithoutAdmin = branches.filter((b) => !b.admin_name);
  const allBranchesTaken = globalAdmin !== null;

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h2>Staff</h2>
          <button className="btn gold sm" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : '+ Add staff'}
          </button>
        </div>

        <div className="alert info" style={{ marginBottom: 16 }}>
          Only you can add or change staff. Nobody inside the business can — not even a branch admin.
        </div>

        {open && (
          <form
            style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--border-subtle)' }}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const v = (n: string) => String(form.get(n) ?? '').trim();
              await run(
                () => api.post(`/platform/tenants/${tenantId}/users`, {
                  email: v('email'), fullName: v('fullName'), password: v('password'),
                  role: v('role'), phone: v('phone') || undefined,
                  branchId: v('branchId') || undefined,
                }),
                `${v('fullName')} added.`,
              );
              setOpen(false);
            }}
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="fullName">Full name<span className="req">*</span></label>
                <input id="fullName" name="fullName" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email<span className="req">*</span></label>
                <input id="email" name="email" type="email" required />
              </div>
              <div className="field">
                <label htmlFor="password">Password<span className="req">*</span>
                  <span className="hint">At least 8 characters. Share it with them securely.</span>
                </label>
                <input id="password" name="password" type="text" required minLength={8} />
              </div>
              <div className="field">
                <label htmlFor="role">Role<span className="req">*</span></label>
                <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)} required>
                  {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" />
              </div>
              <div className="field">
                <label htmlFor="branchId">Branch
                  <span className="hint">
                    {creatingAdmin
                      ? 'A branch has one admin, so only branches without one are listed.'
                      : 'Leave blank for access to every branch.'}
                  </span>
                </label>
                <select id="branchId" name="branchId" defaultValue="">
                  <option value="" disabled={creatingAdmin && allBranchesTaken}>
                    {creatingAdmin && allBranchesTaken
                      ? `All branches — taken by ${globalAdmin?.full_name}`
                      : 'All branches'}
                  </option>
                  {(creatingAdmin ? branchesWithoutAdmin : branches).map((b) => (
                    <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {creatingAdmin && branchesWithoutAdmin.length === 0 && allBranchesTaken && (
              <div className="alert error" style={{ marginTop: 14 }}>
                Every branch already has an admin. Move or deactivate one before adding another.
              </div>
            )}

            <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 14 }}>
              {busy ? <><span className="spinner" /> Adding…</> : 'Add staff member'}
            </button>
          </form>
        )}

        {users.length === 0 ? (
          <div className="empty">No staff yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Last sign-in</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong>{u.phone && <div className="faint">{u.phone}</div>}</td>
                    <td className="muted">{u.email}</td>
                    <td>
                      <span className={`pill ${u.role_code === 'admin' ? 'role' : 'off'}`}>
                        {u.role_name ?? u.role_code}
                      </span>
                    </td>
                    <td className="muted">
                      {u.branch_code ? <code>{u.branch_code}</code> : <span className="faint">All branches</span>}
                    </td>
                    <td className="faint">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-IN') : 'Never'}</td>
                    <td><span className={`pill ${u.is_active ? 'active' : 'off'}`}>{u.is_active ? 'active' : 'disabled'}</span></td>
                    <td className="row-actions">
                      <select
                        defaultValue={u.role_code}
                        disabled={busy}
                        onChange={(e) => run(
                          () => api.patch(`/platform/tenants/${tenantId}/users/${u.id}`, { role: e.target.value }),
                          `${u.full_name} is now ${roles.find((r) => r.code === e.target.value)?.name ?? e.target.value}.`,
                        )}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 12.4 }}
                      >
                        {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                      </select>
                      <button
                        className={`btn sm ${u.is_active ? 'danger' : 'ghost'}`}
                        disabled={busy}
                        onClick={() => run(
                          () => api.patch(`/platform/tenants/${tenantId}/users/${u.id}`, { isActive: !u.is_active }),
                          `${u.full_name} ${u.is_active ? 'deactivated' : 'reactivated'}.`,
                        )}
                      >
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Who runs which branch</h3>
        <p className="faint" style={{ margin: '0 0 12px' }}>
          A branch has exactly one admin. One admin can instead cover every branch —
          that is the usual shape for a single-shop business.
        </p>

        {globalAdmin && (
          <div className="alert ok" style={{ marginBottom: 12 }}>
            <strong>{globalAdmin.full_name}</strong> administers all branches.
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr><th>Branch</th><th>Admin</th></tr></thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td><code>{b.code}</code> {b.name}</td>
                  <td>
                    {b.admin_name
                      ? <>{b.admin_name} <span className="faint">{b.admin_email}</span></>
                      : globalAdmin
                        ? <span className="faint">{globalAdmin.full_name} (all branches)</span>
                        : <span className="pill suspended">no admin</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>The four roles</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Role</th><th>What they can do</th><th>Limit</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.code}>
                  <td><span className={`pill ${r.isBranchAdmin ? 'role' : 'off'}`}>{r.name}</span></td>
                  <td className="muted">{r.description}</td>
                  <td className="faint">{r.isBranchAdmin ? 'One per branch' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------- branches */

function BranchesTab({
  tenantId, branches, run, busy,
}: { tenantId: string; branches: BranchRow[]; run: Runner; busy: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <div className="card-head">
        <h2>Branches</h2>
        <button className="btn gold sm" onClick={() => setOpen((v) => !v)}>{open ? 'Close' : '+ Add branch'}</button>
      </div>

      {open && (
        <form
          style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--border-subtle)' }}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const v = (n: string) => String(form.get(n) ?? '').trim();
            await run(
              () => api.post(`/platform/tenants/${tenantId}/branches`, {
                code: v('code'), name: v('name'), kind: v('kind'),
                city: v('city') || undefined, state: v('state') || undefined,
                stateCode: v('stateCode') || undefined, gstin: v('gstin') || undefined,
              }),
              `${v('name')} added, with its locations and numbering.`,
            );
            setOpen(false);
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="bcode">Code<span className="req">*</span></label>
              <input id="bcode" name="code" required maxLength={20} placeholder="AHM" />
            </div>
            <div className="field">
              <label htmlFor="bname">Name<span className="req">*</span></label>
              <input id="bname" name="name" required placeholder="Ahmedabad Boutique" />
            </div>
            <div className="field">
              <label htmlFor="bkind">Type</label>
              <select id="bkind" name="kind" defaultValue="showroom">
                <option value="showroom">Showroom</option>
                <option value="factory">Factory</option>
                <option value="warehouse">Warehouse</option>
                <option value="office">Office</option>
              </select>
            </div>
            <div className="field"><label htmlFor="bcity">City</label><input id="bcity" name="city" /></div>
            <div className="field"><label htmlFor="bstate">State</label><input id="bstate" name="state" /></div>
            <div className="field">
              <label htmlFor="bstateCode">GST state code</label>
              <input id="bstateCode" name="stateCode" maxLength={2} placeholder="24" />
            </div>
            <div className="field">
              <label htmlFor="bgstin">Branch GSTIN
                <span className="hint">Each branch can have its own registration.</span>
              </label>
              <input id="bgstin" name="gstin" />
            </div>
          </div>
          <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 14 }}>
            {busy ? <><span className="spinner" /> Adding…</> : 'Add branch'}
          </button>
        </form>
      )}

      {branches.length === 0 ? (
        <div className="empty">No branches yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>City</th><th>Admin</th><th className="num">Locations</th><th>Status</th></tr></thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td><code>{b.code}</code></td>
                  <td><strong>{b.name}</strong></td>
                  <td className="muted">{b.kind}</td>
                  <td className="muted">{b.city ?? '—'}</td>
                  <td className="faint">{b.admin_name ?? <span className="pill suspended">none</span>}</td>
                  <td className="num">{b.location_count}</td>
                  <td><span className={`pill ${b.is_active ? 'active' : 'off'}`}>{b.is_active ? 'active' : 'closed'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- modules */

function ModulesTab({
  tenantId, modules, run, busy,
}: { tenantId: string; modules: ModuleRow[]; run: Runner; busy: boolean }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>Module licences</h2>
      </div>
      <p className="faint" style={{ margin: '0 0 14px' }}>
        A lapsed module still shows in the tenant’s dock, locked — they can see what they are missing
        rather than having it disappear.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Module</th><th>Group</th><th>Licence</th><th>Expires</th><th>Enabled</th><th /></tr></thead>
          <tbody>
            {modules.map((m) => {
              const deadline = m.licence === 'trial' ? m.trial_ends_at : m.expires_at;
              return (
                <tr key={m.module_key}>
                  <td><strong>{m.name}</strong><div className="faint"><code>{m.module_key}</code></div></td>
                  <td className="muted">{m.group}</td>
                  <td><span className={`pill ${m.licence}`}>{m.licence}</span></td>
                  <td className="faint">{deadline ? new Date(deadline).toLocaleDateString('en-IN') : '—'}</td>
                  <td><span className={`pill ${m.enabled ? 'active' : 'off'}`}>{m.enabled ? 'on' : 'off'}</span></td>
                  <td className="row-actions">
                    <select
                      defaultValue={m.licence}
                      disabled={busy}
                      onChange={(e) => run(
                        () => api.put(`/platform/tenants/${tenantId}/modules/${m.module_key}`, {
                          licence: e.target.value,
                          trialEndsAt: e.target.value === 'trial'
                            ? new Date(Date.now() + 30 * 86400000).toISOString()
                            : null,
                        }),
                        `${m.name} set to ${e.target.value}.`,
                      )}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 12.4 }}
                    >
                      <option value="included">Included</option>
                      <option value="purchased">Purchased</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                    </select>
                    <button
                      className="btn ghost sm"
                      disabled={busy}
                      onClick={() => run(
                        () => api.put(`/platform/tenants/${tenantId}/modules/${m.module_key}`, { enabled: !m.enabled }),
                        `${m.name} turned ${m.enabled ? 'off' : 'on'}.`,
                      )}
                    >
                      {m.enabled ? 'Turn off' : 'Turn on'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- settings */

function SettingsTab({
  tenantId, tenant, run, busy,
}: { tenantId: string; tenant: Record<string, string | null>; run: Runner; busy: boolean }) {
  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>Business details</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const v = (n: string) => String(form.get(n) ?? '').trim();
            await run(
              () => api.patch(`/platform/tenants/${tenantId}`, {
                displayName: v('displayName'), legalName: v('legalName'),
                kind: v('kind'), gstin: v('gstin') || undefined,
              }),
              'Saved.',
            );
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="sDisplay">Display name</label>
              <input id="sDisplay" name="displayName" defaultValue={tenant.display_name ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="sLegal">Legal name</label>
              <input id="sLegal" name="legalName" defaultValue={tenant.legal_name ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="sKind">Business type</label>
              <select id="sKind" name="kind" defaultValue={tenant.kind ?? 'retailer'}>
                <option value="retailer">Retailer</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="sGstin">GSTIN</label>
              <input id="sGstin" name="gstin" defaultValue={tenant.gstin ?? ''} />
            </div>
          </div>
          <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 14 }}>Save changes</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Account status</h2>
        <p className="faint" style={{ margin: '0 0 14px' }}>
          Suspending blocks every user of this business from signing in. Their data is untouched.
        </p>
        <div className="row-actions">
          {(['active', 'trial', 'suspended', 'closed'] as const).map((status) => (
            <button
              key={status}
              className={`btn sm ${status === tenant.status ? 'primary' : status === 'suspended' || status === 'closed' ? 'danger' : 'ghost'}`}
              disabled={busy || status === tenant.status}
              onClick={() => run(
                () => api.patch(`/platform/tenants/${tenantId}`, { status }),
                `Account set to ${status}.`,
              )}
            >
              {status === tenant.status ? `Currently ${status}` : `Set ${status}`}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
