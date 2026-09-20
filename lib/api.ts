'use client';

/**
 * Browser-side API helper.
 *
 * Talks only to this app's own `/api/proxy/*`, which attaches the operator's
 * token server-side. No token ever touches client JavaScript.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class AdminApiError extends Error {
  constructor(readonly status: number, readonly error: ApiError) {
    super(error.message);
    this.name = 'AdminApiError';
  }

  /** Field-level messages from a 400, ready to attach to inputs. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.error.details)) return {};
    const out: Record<string, string> = {};
    for (const item of this.error.details as Array<{ field?: string; message?: string }>) {
      if (item.field && item.message) out[item.field] = item.message;
    }
    return out;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/proxy/${path.replace(/^\/+/, '')}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      (payload as { error?: ApiError })?.error ?? { code: 'unknown', message: 'Something went wrong.' },
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/* ---------------- shapes the panel uses ---------------- */

export interface TenantRow {
  id: string; code: string; display_name: string; legal_name: string;
  kind: string; status: string; gstin: string | null; created_at: string;
  branch_count: string; user_count: string; module_count: string; admin_email: string | null;
}

export interface TenantRole {
  code: string; name: string; description: string;
  /** True for the one role limited to a single holder per branch. */
  isBranchAdmin: boolean;
  permissions: string[];
}

export interface BranchRow {
  id: string; code: string; name: string; kind: string; city: string | null;
  state: string | null; gstin: string | null; is_active: boolean; location_count: string;
  /** The one admin for this branch, if it has one yet. */
  admin_name: string | null; admin_email: string | null;
}

export interface UserRow {
  id: string; email: string; full_name: string; phone: string | null;
  is_active: boolean; last_login_at: string | null; created_at: string;
  role_code: string; role_name: string | null;
  default_branch_id: string | null; branch_name: string | null; branch_code: string | null;
}

export interface ModuleRow {
  module_key: string; name: string; group: string; enabled: boolean;
  licence: string; trial_ends_at: string | null; expires_at: string | null;
}

export interface PlatformStats {
  tenants: { total: number; active: number; trial: number; suspended: number };
  users: number; branches: number; operators: number;
}

export const ADMIN_ROLE = 'admin';
