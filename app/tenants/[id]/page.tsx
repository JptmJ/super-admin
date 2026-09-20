import { redirect } from 'next/navigation';
import Link from 'next/link';
import { callBackend, readSession } from '@/lib/session';
import { Shell } from '@/components/Shell';
import { TenantWorkspace } from './TenantWorkspace';
import type { BranchRow, ModuleRow, TenantRole, UserRow } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Detail {
  tenant: Record<string, string | null>;
  branches: BranchRow[];
  users: UserRow[];
  modules: ModuleRow[];
  globalAdmin: UserRow | null;
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await readSession())) redirect('/login');
  const { id } = await params;

  const [detailResult, rolesResult] = await Promise.all([
    callBackend<Detail>(`/api/platform/tenants/${id}`),
    callBackend<{ tenant: TenantRole[] }>('/api/platform/roles'),
  ]);

  if (detailResult.status === 401) redirect('/login');

  if (!detailResult.data) {
    return (
      <Shell>
        <div className="page-head"><h1>Tenant</h1></div>
        <div className="alert error">{detailResult.error?.message ?? 'Could not load this tenant.'}</div>
        <Link className="btn ghost" href="/tenants">Back to tenants</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <TenantWorkspace
        tenantId={id}
        detail={detailResult.data}
        roles={rolesResult.data?.tenant ?? []}
      />
    </Shell>
  );
}
