import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";
import { STRINGS, resolveLocale } from "@/lib/strings";

/**
 * Home: public landing page for logged-out visitors, dashboard for
 * signed-in users. No roles, no onboarding — one expense tracker per user.
 * The landing copy follows the fd-lang cookie when set (EN | FR).
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const cookieStore = await cookies();
  const t = STRINGS[resolveLocale(cookieStore.get("fd-lang")?.value)];

  return (
    <main className="container">
      <div className="card exp-landing">
        <div className="brand-text" style={{ fontSize: 28 }}>
          Mile<span>Money</span>
        </div>
        <h1>{t.landingTitle}</h1>
        <p className="muted">{t.landingSub}</p>
        <ul className="exp-landing-list">
          <li>{t.landingF1}</li>
          <li>{t.landingF2}</li>
          <li>{t.landingF3}</li>
        </ul>
        <div className="btn-row">
          <Link href="/login" className="btn">
            {t.login}
          </Link>
          <Link href="/signup" className="btn-secondary">
            {t.signup}
          </Link>
        </div>
      </div>
    </main>
  );
}
