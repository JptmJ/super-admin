'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brand } from './Brand';

/** There is one operator and it holds everything, so nothing here is gated. */
const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/tenants', label: 'Tenants' },
  { href: '/roles', label: 'Roles & Access' },
  { href: '/audit', label: 'Audit Log' },
];

export interface ShellOperator {
  fullName: string;
  roleName: string;
}

export function Shell({ children, operator }: { children: React.ReactNode; operator?: ShellOperator }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="shell">
      <nav className="sidebar">
        <Brand />
        <div className="side-label">Console</div>
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`}>
              {item.label}
            </Link>
          );
        })}

        <div className="side-foot">
          {operator && (
            <div style={{ padding: '0 8px 10px' }}>
              <div style={{ fontSize: 13.4, fontWeight: 600, color: '#fff' }}>{operator.fullName}</div>
              <div style={{ fontSize: 11.4, color: '#7fa294' }}>{operator.roleName}</div>
            </div>
          )}
          <button className="nav-item" onClick={signOut} style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}>
            Sign out
          </button>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
