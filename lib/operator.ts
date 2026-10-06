/**
 * Who is signed in, and what they may do.
 *
 * Every page needs this, both to show the operator their own name and to decide
 * which navigation to render. The panel hides what a role cannot reach rather
 * than letting someone click into a 403 — the backend still refuses, this is
 * only so the console tells the truth about itself.
 *
 * Server-side only: it reads the httpOnly session cookie.
 */
import { callBackend } from './session';
import type { Operator } from './api';

export async function readOperator(): Promise<Operator | null> {
  const result = await callBackend<Operator>('/api/platform/me');
  return result.data;
}

/** What `<Shell>` needs to render the sidebar. */
export const shellOperator = (operator: Operator | null) =>
  operator
    ? { fullName: operator.full_name, roleName: operator.roleName }
    : undefined;
