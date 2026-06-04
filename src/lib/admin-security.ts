// Centralised secret-slug + audit helpers for the masked admin portal.
// The slug is driven by an environment variable so the URL can be rotated
// without changing code: set VITE_ADMIN_SLUG in Workspace Settings → Build
// Secrets. A long, non-guessable fallback is used when the env var is absent.

import { supabase } from "@/integrations/supabase/client";

const FALLBACK_SLUG = "s3cur3-c0ntr0l-9f8a2b4c7d1e6";

export const ADMIN_SLUG: string =
  (import.meta.env.VITE_ADMIN_SLUG as string | undefined)?.trim() || FALLBACK_SLUG;

export function isValidAdminSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  // Constant-time-ish comparison to avoid timing leaks.
  if (slug.length !== ADMIN_SLUG.length) return false;
  let diff = 0;
  for (let i = 0; i < slug.length; i++) {
    diff |= slug.charCodeAt(i) ^ ADMIN_SLUG.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256(input: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

/**
 * Append-only audit trail. IP is intentionally not collected client-side;
 * we hash the user-agent so we can correlate sessions without storing PII.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  target?: { type?: string; id?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  try {
    const uaHash = typeof navigator !== "undefined" ? await sha256(navigator.userAgent) : "";
    await (supabase as any).from("admin_audit_logs").insert({
      admin_id: adminId,
      action,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      metadata: target?.metadata ?? {},
      ip_hash: null,
      user_agent_hash: uaHash || null,
    });
  } catch {
    // Audit failures must never break the admin UI.
  }
}

/**
 * Wipe any cached app state on admin sign-out so a shared device cannot
 * recover tokens, role hints, or recent admin queries from storage.
 */
export function purgeClientStorage(): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* noop */
  }
}
