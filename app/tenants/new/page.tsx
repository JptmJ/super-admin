'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { AdminApiError, api } from '@/lib/api';

interface ModuleOption {
  key: string; name: string; group: string; appliesTo: string; defaultLicence: string;
}

export default function NewTenantPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [licences, setLicences] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('retailer');

  useEffect(() => {
    api.get<{ modules: ModuleOption[] }>('/platform/modules')
      .then((d) => {
        setModules(d.modules);
        setLicences(Object.fromEntries(d.modules.map((m) => [m.key, m.defaultLicence])));
      })
      .catch(() => setError('Could not load the module list.'));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();

    // Only send licences that differ from the module's own default — anything
    // else is noise the backend would just re-apply.
    const changed = modules
      .filter((m) => licences[m.key] && licences[m.key] !== m.defaultLicence)
      .map((m) => ({ key: m.key, licence: licences[m.key] as 'included' | 'purchased' | 'trial', trialDays: 30 }));

    const body = {
      code: value('code'),
      legalName: value('legalName'),
      displayName: value('displayName') || undefined,
      kind,
      gstin: value('gstin') || undefined,
      pan: value('pan') || undefined,
      stateCode: value('stateCode') || undefined,
      admin: {
        email: value('adminEmail'),
        fullName: value('adminName'),
        password: value('adminPassword'),
        phone: value('adminPhone') || undefined,
      },
      branch: value('branchCode')
        ? {
            code: value('branchCode'), name: value('branchName'),
            city: value('branchCity') || undefined,
            state: value('branchState') || undefined,
            stateCode: value('stateCode') || undefined,
            kind: kind === 'manufacturer' ? ('factory' as const) : ('showroom' as const),
          }
        : undefined,
      modules: changed.length ? changed : undefined,
    };

    try {
      const created = await api.post<{ tenantId: string }>('/platform/tenants', body);
      router.push(`/tenants/${created.tenantId}`);
      router.refresh();
    } catch (e) {
      if (e instanceof AdminApiError) {
        setError(e.message);
        setFieldErrors(e.fieldErrors);
      } else {
        setError('Something went wrong.');
      }
      setBusy(false);
    }
  }

  const err = (name: string) => fieldErrors[name];
  const grouped = ['operations', 'commercial', 'finance', 'core'] as const;

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>New tenant</h1>
          <p>
            This creates the business, its chart of accounts, purities, numbering series,
            the admin who runs it, and the first branch — all in one go.
          </p>
        </div>
        <Link className="btn ghost" href="/tenants">Cancel</Link>
      </div>

      {error && (
        <div className="alert error">
          {error}
          {Object.keys(fieldErrors).length > 0 && (
            <ul>{Object.entries(fieldErrors).map(([f, m]) => <li key={f}><strong>{f}</strong>: {m}</li>)}</ul>
          )}
        </div>
      )}

      <form onSubmit={submit}>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>The business</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="code">Tenant code<span className="req">*</span>
                <span className="hint">Used at sign-in. Lowercase, no spaces. Cannot be changed later.</span>
              </label>
              <input id="code" name="code" required pattern="[a-z0-9][a-z0-9\-]{1,29}"
                placeholder="mehta" aria-invalid={!!err('code')} />
              {err('code') && <span className="field-error">{err('code')}</span>}
            </div>
            <div className="field">
              <label htmlFor="legalName">Legal name<span className="req">*</span></label>
              <input id="legalName" name="legalName" required placeholder="Mehta Jewellers Private Limited" />
            </div>
            <div className="field">
              <label htmlFor="displayName">Display name<span className="hint">Shown in the app. Defaults to the legal name.</span></label>
              <input id="displayName" name="displayName" placeholder="Mehta Jewellers" />
            </div>
            <div className="field">
              <label htmlFor="kind">Business type<span className="req">*</span>
                <span className="hint">Decides which modules they can see at all.</span>
              </label>
              <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="retailer">Retailer</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="gstin">GSTIN</label>
              <input id="gstin" name="gstin" placeholder="24AAECM1234N1Z8" aria-invalid={!!err('gstin')} />
              {err('gstin') && <span className="field-error">{err('gstin')}</span>}
            </div>
            <div className="field">
              <label htmlFor="pan">PAN</label>
              <input id="pan" name="pan" placeholder="AAECM1234N" />
            </div>
            <div className="field">
              <label htmlFor="stateCode">GST state code
                <span className="hint">Two digits. Decides CGST+SGST vs IGST on every bill.</span>
              </label>
              <input id="stateCode" name="stateCode" maxLength={2} placeholder="24" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 4 }}>The Admin</h2>
          <p className="faint" style={{ margin: '0 0 14px' }}>
            The first branch admin. They start out covering every branch, and sign in with the
            tenant code above. They run the shop but cannot add staff — you do that, here.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="adminName">Full name<span className="req">*</span></label>
              <input id="adminName" name="adminName" required placeholder="Rajesh Mehta" />
            </div>
            <div className="field">
              <label htmlFor="adminEmail">Email<span className="req">*</span></label>
              <input id="adminEmail" name="adminEmail" type="email" required placeholder="admin@mehta.com"
                aria-invalid={!!err('admin.email')} />
              {err('admin.email') && <span className="field-error">{err('admin.email')}</span>}
            </div>
            <div className="field">
              <label htmlFor="adminPassword">Password<span className="req">*</span>
                <span className="hint">At least 8 characters. Share it with them securely.</span>
              </label>
              <input id="adminPassword" name="adminPassword" type="text" required minLength={8}
                aria-invalid={!!err('admin.password')} />
              {err('admin.password') && <span className="field-error">{err('admin.password')}</span>}
            </div>
            <div className="field">
              <label htmlFor="adminPhone">Phone</label>
              <input id="adminPhone" name="adminPhone" placeholder="9825011223" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 4 }}>First branch</h2>
          <p className="faint" style={{ margin: '0 0 14px' }}>
            Created with its counter, vault and window locations, plus its own invoice numbering.
            Leave blank for a default “MAIN” branch.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="branchCode">Branch code</label>
              <input id="branchCode" name="branchCode" placeholder="SRT" maxLength={20} />
            </div>
            <div className="field">
              <label htmlFor="branchName">Branch name</label>
              <input id="branchName" name="branchName" placeholder="Surat Main Showroom" />
            </div>
            <div className="field">
              <label htmlFor="branchCity">City</label>
              <input id="branchCity" name="branchCity" placeholder="Surat" />
            </div>
            <div className="field">
              <label htmlFor="branchState">State</label>
              <input id="branchState" name="branchState" placeholder="Gujarat" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Module licences</h2>
          <p className="faint" style={{ margin: '0 0 14px' }}>
            Defaults are pre-selected. A lapsed module still appears in their dock, locked — so they
            can see what they are missing rather than having it silently vanish.
          </p>

          {grouped.map((group) => {
            const inGroup = modules.filter(
              (m) => m.group === group && (m.appliesTo === 'both' || kind === 'both' || m.appliesTo === kind),
            );
            if (!inGroup.length) return null;
            return (
              <div key={group} style={{ marginBottom: 16 }}>
                <h3 style={{ textTransform: 'capitalize', marginBottom: 8, color: 'var(--ink-muted)', fontSize: 12, letterSpacing: '0.08em' }}>
                  {group}
                </h3>
                <div className="form-grid">
                  {inGroup.map((m) => (
                    <div className="field" key={m.key}>
                      <label htmlFor={`mod-${m.key}`}>{m.name}</label>
                      <select
                        id={`mod-${m.key}`}
                        value={licences[m.key] ?? m.defaultLicence}
                        onChange={(e) => setLicences((prev) => ({ ...prev, [m.key]: e.target.value }))}
                      >
                        <option value="included">Included</option>
                        <option value="purchased">Purchased</option>
                        <option value="trial">Trial (30 days)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn gold" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" /> Creating…</> : 'Create tenant'}
          </button>
          <Link className="btn ghost" href="/tenants">Cancel</Link>
        </div>
      </form>
    </Shell>
  );
}
