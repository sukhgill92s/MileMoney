/** Week helpers: weeks run Monday -> Sunday. */

export interface WeekRange {
  start: Date; // Monday 00:00 local
  end: Date; // Sunday 23:59:59 local
  label: string;
}

/** Monday of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

/** Week range for the week `offset` weeks from the current week (0 = this week). */
export function weekRange(offset: number): WeekRange {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday, label: weekLabel(monday, sunday) };
}

/** "2026-09-27" in local time (safe for <input type="date"> and date columns). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function weekLabel(monday: Date, sunday: Date): string {
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** "2026-09-27" -> "Sep 27, 2026" (or "27 sept. 2026" for fr-CA). */
export function prettyDate(iso: string, locale = "en-CA"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function cad(n: number, locale = "en-CA"): string {
  return n.toLocaleString(locale, {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
