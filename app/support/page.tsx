import { redirect } from 'next/navigation';
import Link from 'next/link';
import { callBackend, readSession } from '@/lib/session';
import { readOperator, shellOperator } from '@/lib/operator';
import { Shell } from '@/components/Shell';
import { SupportSessionList } from './SupportSessionList';
import type { SupportSessionRow } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  if (!(await readSession())) redirect('/login');
  const params = await searchParams;
  const openOnly = params.open === '1';

  const [operator, result] = await Promise.all([
    readOperator(),
    callBackend<{ rows: SupportSessionRow[] }>(
      `/api/platform/support-sessions?limit=200${openOnly ? '&openOnly=true' : ''}`,
    ),
  ]);

  if (result.status === 401) redirect('/login');
  const rows = result.data?.rows ?? [];
  const live = rows.filter((r) => r.is_open);

  return (
    <Shell operator={shellOperator(operator)}>
      <div className="page-head">
        <div>
          <h1>Support sessions</h1>
          <p>
            Every time someone from the platform went inside a business, and what they changed.
            This is the record a tenant is shown when they ask who touched their data.
          </p>
        </div>
      </div>

      {result.error && <div className="alert error">{result.error.message}</div>}

      {live.length > 0 && (
        <div className="alert info">
          {live.length === 1 ? 'One session is' : `${live.length} sessions are`} open right now.
          A session keeps working until it is closed or its window runs out.
        </div>
      )}

      <form className="card" style={{ marginBottom: 16 }}>
        <div className="row-actions">
          <Link className={`btn sm ${openOnly ? 'ghost' : 'primary'}`} href="/support">All sessions</Link>
          <Link className={`btn sm ${openOnly ? 'primary' : 'ghost'}`} href="/support?open=1">Open only</Link>
        </div>
      </form>

      <div className="card">
        <p className="faint" style={{ margin: '0 0 14px' }}>
          Sessions are started from a tenant’s Support tab, so the reason is recorded against the
          right business.
        </p>
        <SupportSessionList rows={rows} canEnd />
      </div>
    </Shell>
  );
}
