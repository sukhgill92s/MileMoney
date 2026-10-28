"use client";

import { useLocale } from "@/lib/locale";

/**
 * Brand block for the public auth pages, in the app's design language:
 * teal-gradient mark + MileMoney + tagline + feature list, on the dark
 * gradient auth screen. Copy stays in EN | FR via the strings file.
 */
export default function AuthHero() {
  const { t } = useLocale();
  const features = [
    { icon: "📊", title: t.heroF1t, desc: t.heroF1d },
    { icon: "📱", title: t.heroF2t, desc: t.heroF2d },
    { icon: "🧾", title: t.heroF3t, desc: t.heroF3d },
  ];
  return (
    <div className="auth-hero">
      <div className="auth-hero-inner">
        <div className="auth-brand">
          <span className="brandmark">
            M<span>·</span>
          </span>
          <span>
            <strong>MileMoney</strong>
            <small>DRIVE YOUR NUMBERS</small>
          </span>
        </div>
        <p className="auth-tagline">{t.heroTagline}</p>
        <ul className="auth-features">
          {features.map((f) => (
            <li key={f.title}>
              <span className="auth-fi">{f.icon}</span>
              <span>
                <strong>{f.title}</strong>
                <small>{f.desc}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
