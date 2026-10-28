"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useLocale, LangToggle } from "@/lib/locale";

/** App header for the expense tracker, with the EN | FR toggle. */
export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const tabs = [
    { href: "/dashboard", label: t.dashboard },
    { href: "/expenses/new", label: t.addExpense },
  ];

  return (
    <div className="header">
      <Link href="/dashboard" className="brand">
        <span className="brand-logo" aria-hidden="true">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zm-12-8h11l3 5v5h-2a3 3 0 01-6 0H10a3 3 0 01-6 0H3V9l3-4h8v4H6z" />
          </svg>
        </span>
        <span className="brand-text">
          Mile<span>Money</span>
        </span>
      </Link>
      <div className="header-actions">
        <LangToggle />
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={pathname === t.href ? "app-nav-link active" : "app-nav-link"}
          >
            {t.label}
          </Link>
        ))}
        <button
          type="button"
          className="signout-icon"
          onClick={signOut}
          title={t.signOut}
          aria-label={t.signOut}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
