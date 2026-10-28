"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import { prettyDate } from "@/lib/week";

/**
 * Accountant access (v1.4, owner view, ported from the v1.6 grant flow
 * and adapted to the live schema): the owner grants read-only access
 * to an accountant who already has a MileMoney account, by pasting the
 * accountant's account UUID. There is intentionally NO email lookup —
 * the accountant supplies their own UUID after creating an account.
 * Grants are revoked, never deleted, so the history stays visible.
 * Receipt photos are never shared (storage stays owner-only), and the
 * accountant-side viewing screen is a later step — v1.4 ships grants
 * + read-only RLS only.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Grant {
  id: string;
  accountant_id: string;
  status: string;
  created_at: string;
}

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    (error.message ?? "").includes("Could not find the table")
  );
}

export default function AccountantPage() {
  const { t, locale } = useLocale();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uuid, setUuid] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t.pleaseSignIn);
        return;
      }
      const { data, error: qErr } = await supabase
        .from("accountant_access")
        .select("id, accountant_id, status, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (qErr) {
        if (isMissingTable(qErr)) {
          setError(t.accountantLoadError);
          return;
        }
        throw qErr;
      }
      setGrants((data ?? []) as Grant[]);
    } catch {
      setError(t.accountantLoadError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const trimmed = uuid.trim();
    if (!UUID_RE.test(trimmed)) {
      setError(t.accountantUuidError);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t.pleaseSignIn);
        return;
      }
      if (trimmed.toLowerCase() === user.id.toLowerCase()) {
        setError(t.accountantSelf);
        return;
      }
      const { error: upErr } = await supabase
        .from("accountant_access")
        .upsert(
          { owner_id: user.id, accountant_id: trimmed, status: "active" },
          { onConflict: "owner_id,accountant_id" }
        );
      if (upErr) throw upErr;
      setUuid("");
      setNotice(t.accountantGranted);
      await load();
    } catch {
      setError(t.accountantSaveError);
    } finally {
      setSaving(false);
    }
  }

  async function revoke(g: Grant) {
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error: upErr } = await supabase
        .from("accountant_access")
        .update({ status: "revoked" })
        .eq("id", g.id)
        .eq("owner_id", user.id);
      if (upErr) throw upErr;
      await load();
    } catch {
      setError(t.accountantSaveError);
    }
  }

  return (
    <Shell active="none">
      <div className="container">
        <h1>{t.accountantTitle}</h1>
        <p className="muted">{t.accountantSub}</p>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="success-box">{notice}</div>}

        <form className="card" onSubmit={grant}>
          <h2 className="exp-section-title" style={{ marginTop: 0 }}>
            {t.accountantInvite}
          </h2>
          <p className="muted">{t.accountantInviteNote}</p>
          <div className="formgrid">
            <label className="full">
              {t.accountantUuidLabel}
              <input
                type="text"
                required
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                placeholder={t.accountantUuidPlaceholder}
                maxLength={64}
              />
            </label>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? t.saving : t.accountantGrant}
            </button>
          </div>
        </form>

        <h2 className="exp-section-title">{t.accountantPermissions}</h2>
        {loading ? (
          <div className="card">
            <p className="muted">{t.loading}</p>
          </div>
        ) : grants.length === 0 ? (
          <p className="muted">{t.accountantNoGrants}</p>
        ) : (
          grants.map((g) => (
            <div key={g.id} className="card exp-row">
              <div className="exp-row-main">
                <div className="exp-row-title">{g.accountant_id}</div>
                <div className="muted">
                  {g.status} ·{" "}
                  {prettyDate(g.created_at.slice(0, 10), locale)}
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={g.status === "revoked"}
                onClick={() => revoke(g)}
              >
                {t.accountantRevoke}
              </button>
            </div>
          ))
        )}

        <p className="muted">{t.accountantReceiptNote}</p>
        <p className="muted">{t.accountantViewNote}</p>
      </div>
    </Shell>
  );
}
