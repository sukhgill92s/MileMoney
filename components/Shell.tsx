"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useLocale, LangToggle } from "@/lib/locale";

/**
 * App shell for the signed-in pages: fixed dark sidebar on desktop (brand
 * block + WORKSPACE nav + language toggle + logout at the bottom), white
 * topbar, fixed bottom nav on mobile. Nav is exactly five tabs, in order:
 * Dashboard, Expenses (history list), Scan (the expense scan flow),
 * Income, Reports (monthly PDF + CSV downloads).
 */
export type ShellActive =
  | "dashboard"
  | "expenses"
  | "scan"
  | "income"
  | "reports";

export default function Shell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: ShellActive;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  const resolved: ShellActive =
    active ??
    (pathname === "/income"
      ? "income"
      : pathname === "/reports"
        ? "reports"
        : pathname === "/expenses"
          ? "expenses"
          : pathname.startsWith("/expenses")
            ? "expenses"
            : "dashboard");

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links: { key: ShellActive; href: string; label: string; icon: string }[] = [
    { key: "dashboard", href: "/dashboard", label: t.dashboard, icon: "🏠" },
    { key: "expenses", href: "/expenses", label: t.expensesHeading, icon: "📋" },
    { key: "scan", href: "/expenses/new?scan=1", label: t.scanReceipt, icon: "📷" },
    { key: "income", href: "/income", label: t.income, icon: "💰" },
    { key: "reports", href: "/reports", label: t.reports, icon: "📊" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brandmark">
            M<span>·</span>
          </span>
          <span>
            <strong>MileMoney</strong>
            <small>DRIVE YOUR NUMBERS</small>
          </span>
        </Link>
        <p className="navlabel">WORKSPACE</p>
        <nav>
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={resolved === l.key ? "active" : ""}
            >
              <span aria-hidden="true">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sidebarbottom">
          <LangToggle />
          <button type="button" onClick={signOut}>
            <span aria-hidden="true">↪</span>
            {t.signOut}
          </button>
        </div>
      </aside>
      <div className="body">
        <header className="topbar">
          <Link href="/dashboard" className="topbrand">
            MileMoney
          </Link>
          <span className="topright">
            <span className="secure">● {t.secureWorkspace}</span>
            <LangToggle />
          </span>
        </header>
        <main className="content">{children}</main>
      </div>
      <nav className="bottomnav">
        {links.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            className={resolved === l.key ? "active" : ""}
          >
            <span aria-hidden="true">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
