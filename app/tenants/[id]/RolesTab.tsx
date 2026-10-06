'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminApiError, api,
  type PermissionTreeModule, type TenantRoleRow,
} from '@/lib/api';

/**
 * A business's roles, and the builder for its staff roles.
 *
 * Owner and Branch Admin are fixed and shown read-only — narrowing an owner
 * would lock a shop out of its own books. Everything else is a staff role named
 * for this business, which is the point: one shop's "Accountant" does billing,
 * another's does billing and tagging, and both are called Accountant.
 *
 * The tree comes from the API, which builds it from the live routes, so a tick
 * here always grants something real.
 */
export function RolesTab({
  tenantId, roles, tree, run, busy,
}: {
  tenantId: string;
  roles: TenantRoleRow[];
  tree: PermissionTreeModule[];
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
  busy: boolean;
}) {
  const [editing, setEditing] = useState<TenantRoleRow | null>(null);
  const [creating, setCreating] = useState(false);

  const fixed = roles.filter((r) => r.role_type !== 'staff');
  const staff = roles.filter((r) => r.role_type === 'staff');

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h2>Staff roles</h2>
          <button
            className="btn gold sm"
            onClick={() => { setCreating((v) => !v); setEditing(null); }}
          >
            {creating ? 'Close' : '+ New staff role'}
          </button>
        </div>

        <div className="alert info" style={{ marginBottom: 16 }}>
          Name the role as this shop thinks of it, then tick exactly what it may reach. Only
          permissions the API actually enforces are offered, so nothing here is decorative.
        </div>

        {creating && (
          <RoleEditor
            tree={tree}
            busy={busy}
            onCancel={() => setCreating(false)}
            onSave={async (values) => {
              await run(
                () => api.post(`/platform/tenants/${tenantId}/roles`, values),
                `${values.name} created.`,
              );
              setCreating(false);
            }}
          />
        )}

        {staff.length === 0 && !creating ? (
          <div className="empty">
            No staff roles yet. Everyone here is either the owner or a branch admin.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Role</th><th>What it reaches</th><th className="num">Held by</th><th>State</th><th /></tr>
              </thead>
              <tbody>
                {staff.map((role) => (
                  <Fragment key={role.id}>
                    <tr>
                      <td>
                        <strong>{role.name}</strong>
                        <div className="faint"><code>{role.code}</code></div>
                        {role.description && <div className="faint">{role.description}</div>}
                      </td>
                      <td style={{ maxWidth: 420 }}><PermissionSummary permissions={role.permissions} tree={tree} /></td>
                      <td className="num">{role.user_count}</td>
                      <td>
                        <span className={`pill ${role.is_active ? 'active' : 'off'}`}>
                          {role.is_active ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td className="row-actions">
                        <button
                          className="btn ghost sm"
                          disabled={busy}
                          onClick={() => { setEditing(editing?.id === role.id ? null : role); setCreating(false); }}
                        >
                          {editing?.id === role.id ? 'Close' : 'Edit'}
                        </button>
                        <button
                          className="btn ghost sm"
                          disabled={busy}
                          onClick={() => run(
                            () => api.patch(`/platform/tenants/${tenantId}/roles/${role.id}`, { isActive: !role.is_active }),
                            `${role.name} ${role.is_active ? 'disabled' : 'enabled'}.`,
                          )}
                        >
                          {role.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn danger sm"
                          disabled={busy || role.user_count > 0}
                          title={role.user_count > 0 ? 'Someone still holds this role.' : undefined}
                          onClick={() => run(
                            () => api.del(`/platform/tenants/${tenantId}/roles/${role.id}`),
                            `${role.name} deleted.`,
                          )}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {editing?.id === role.id && (
                      <tr>
                        <td colSpan={5} style={{ background: 'var(--surface-sunken, rgba(0,0,0,.03))' }}>
                          <RoleEditor
                            tree={tree}
                            busy={busy}
                            initial={role}
                            onCancel={() => setEditing(null)}
                            onSave={async (values) => {
                              await run(
                                () => api.patch(`/platform/tenants/${tenantId}/roles/${role.id}`, values),
                                `${values.name} saved.`,
                              );
                              setEditing(null);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Fixed roles</h2>
          <span className="faint">seeded with the business</span>
        </div>
        <p className="faint" style={{ margin: '0 0 14px' }}>
          These two cannot be edited. An owner holds everything by definition, and a branch admin
          that could not run a branch would not be one — make a staff role instead.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Role</th><th>What it reaches</th><th className="num">Held by</th></tr></thead>
            <tbody>
              {fixed.map((role) => (
                <tr key={role.id}>
                  <td>
                    <strong>{role.name}</strong>
                    <div className="faint"><code>{role.role_type}</code></div>
                  </td>
                  <td style={{ maxWidth: 440 }}>
                    {role.permissions.includes('*')
                      ? <span className="pill active">everything</span>
                      : <PermissionSummary permissions={role.permissions} tree={tree} />}
                  </td>
                  <td className="num">{role.user_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** Reads a permission list back as module names, rather than a wall of codes. */
function PermissionSummary({ permissions, tree }: { permissions: string[]; tree: PermissionTreeModule[] }) {
  const byModule = useMemo(() => {
    const names = new Map<string, string>(tree.map((m) => [m.key, m.name]));
    const counts = new Map<string, { whole: boolean; n: number }>();
    for (const p of permissions) {
      const moduleKey = p.split('.')[0]!;
      const entry = counts.get(moduleKey) ?? { whole: false, n: 0 };
      if (p === `${moduleKey}.*`) entry.whole = true;
      entry.n += 1;
      counts.set(moduleKey, entry);
    }
    return [...counts.entries()].map(([key, v]) => ({
      key, name: names.get(key) ?? key, whole: v.whole, n: v.n,
    }));
  }, [permissions, tree]);

  if (!permissions.length) return <span className="faint">Nothing</span>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {byModule.map((m) => (
        <span className={`pill ${m.whole ? 'active' : 'off'}`} key={m.key}>
          {m.name}{m.whole ? '' : ` · ${m.n}`}
        </span>
      ))}
    </div>
  );
}

interface EditorValues { name: string; description: string | null; permissions: string[] }

/**
 * Module → group → action, with a tick at each level.
 *
 * Ticking a whole module sends its wildcard rather than every leaf under it, so
 * a role granted "all of Billing" keeps that meaning when new billing endpoints
 * are added later instead of silently falling behind.
 */
function RoleEditor({
  tree, busy, initial, onSave, onCancel,
}: {
  tree: PermissionTreeModule[];
  busy: boolean;
  initial?: TenantRoleRow;
  onSave: (values: EditorValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [picked, setPicked] = useState<Set<string>>(new Set(initial?.permissions ?? []));
  const [open, setOpen] = useState<string | null>(tree[0]?.key ?? null);

  const has = (code: string) => picked.has(code);

  const toggle = (code: string, on: boolean, clears: string[] = []) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) {
        next.add(code);
        // A wildcard makes everything beneath it redundant; keep the list tidy.
        for (const c of clears) next.delete(c);
      } else {
        next.delete(code);
      }
      return next;
    });
  };

  /** A module counts as fully granted when its wildcard is held. */
  const moduleState = (m: PermissionTreeModule) => {
    if (has(m.wildcard)) return 'all' as const;
    const any = m.groups.some((g) =>
      (g.wildcard && has(g.wildcard)) || g.permissions.some((p) => has(p.code)));
    return any ? ('some' as const) : ('none' as const);
  };

  const total = picked.size;

  return (
    <form
      style={{ padding: '4px 0 8px' }}
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({
          name: name.trim(),
          description: description.trim() || null,
          permissions: [...picked],
        });
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`rn-${initial?.id ?? 'new'}`}>Role name<span className="req">*</span>
            <span className="hint">What this shop calls the job — Accountant, Counter Staff.</span>
          </label>
          <input
            id={`rn-${initial?.id ?? 'new'}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required minLength={2} maxLength={60}
          />
        </div>
        <div className="field">
          <label htmlFor={`rd-${initial?.id ?? 'new'}`}>Description</label>
          <input
            id={`rd-${initial?.id ?? 'new'}`}
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
          />
        </div>
      </div>

      <div style={{ margin: '16px 0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>What it may reach</strong>
        <span className="faint">{total} permission{total === 1 ? '' : 's'} selected</span>
      </div>

      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
        {tree.map((m) => {
          const state = moduleState(m);
          const isOpen = open === m.key;
          const everyCodeUnder = [
            ...m.groups.flatMap((g) => g.permissions.map((p) => p.code)),
            ...m.groups.map((g) => g.wildcard).filter((w): w is string => Boolean(w)),
          ];

          return (
            <div key={m.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, flex: 1, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={state === 'all'}
                    ref={(el) => { if (el) el.indeterminate = state === 'some'; }}
                    onChange={(e) => {
                      if (e.target.checked) toggle(m.wildcard, true, everyCodeUnder);
                      else setPicked((prev) => {
                        const next = new Set(prev);
                        next.delete(m.wildcard);
                        for (const c of everyCodeUnder) next.delete(c);
                        return next;
                      });
                    }}
                  />
                  {m.name}
                  {state === 'all' && <span className="pill active">all</span>}
                  {state === 'some' && <span className="pill trial">partial</span>}
                </label>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setOpen(isOpen ? null : m.key)}
                >
                  {isOpen ? 'Hide' : 'Choose'}
                </button>
              </div>

              {isOpen && (
                <div style={{ padding: '0 12px 12px 34px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {m.groups.map((g) => {
                    const groupCodes = g.permissions.map((p) => p.code);
                    const groupAll = g.wildcard ? has(g.wildcard) : groupCodes.every((c) => has(c));
                    const covered = has(m.wildcard);

                    return (
                      <div key={g.key}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.8, fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            style={{ width: 'auto' }}
                            disabled={covered}
                            checked={covered || groupAll}
                            onChange={(e) => {
                              if (g.wildcard) {
                                if (e.target.checked) toggle(g.wildcard, true, groupCodes);
                                else toggle(g.wildcard, false);
                              } else {
                                setPicked((prev) => {
                                  const next = new Set(prev);
                                  for (const c of groupCodes) e.target.checked ? next.add(c) : next.delete(c);
                                  return next;
                                });
                              }
                            }}
                          />
                          {g.name}
                        </label>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '4px 0 0 24px' }}>
                          {g.permissions.map((p) => {
                            const byWildcard = covered || (g.wildcard ? has(g.wildcard) : false);
                            return (
                              <label
                                key={p.code}
                                title={p.description}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.2, fontWeight: 400 }}
                              >
                                <input
                                  type="checkbox"
                                  style={{ width: 'auto' }}
                                  disabled={byWildcard}
                                  checked={byWildcard || has(p.code)}
                                  onChange={(e) => toggle(p.code, e.target.checked)}
                                />
                                {p.action}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="row-actions" style={{ marginTop: 14 }}>
        <button className="btn primary" type="submit" disabled={busy || total === 0}>
          {busy ? <><span className="spinner" /> Saving…</> : initial ? 'Save role' : 'Create role'}
        </button>
        <button className="btn ghost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        {total === 0 && <span className="faint">Tick at least one permission.</span>}
      </div>
    </form>
  );
}
