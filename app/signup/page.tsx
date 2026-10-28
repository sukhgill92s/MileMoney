"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { useLocale, LangToggle } from "@/lib/locale";
import AuthHero from "@/components/AuthHero";

export default function SignupPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.session) {
        // Email confirmation is disabled — user is signed in immediately.
        window.location.href = "/";
        return;
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <AuthHero />
      <div className="auth-form-wrap">
        <div className="auth-topbar">
          <LangToggle />
        </div>
        <div className="card auth-card">
          <h1>{t.createAccount}</h1>
          <p className="muted">{t.signupSub}</p>
          {done ? (
            <div className="success-box">{t.checkEmail}</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="error-box">{error}</div>}
              <div className="field">
                <label htmlFor="email">{t.email}</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="password">{t.password}</label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? t.creating : t.createAccountBtn}
              </button>
            </form>
          )}
          <div className="auth-links">
            {t.haveAccount} <Link href="/login">{t.signIn}</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
