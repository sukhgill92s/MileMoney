"use client";

import { useLocale } from "@/lib/locale";

/**
 * Night-highway hero panel for the public auth pages.
 * Dark navy + amber — MileMoney's own identity, distinct from Driver Day Tracker.
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
          🚛 Mile<span>Money</span>
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
      <div className="auth-road">
        <div className="auth-road-line" />
      </div>
    </div>
  );
}
