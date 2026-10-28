/**
 * Best-effort parsing of OCR text from a receipt photo.
 * Returns what could be found; anything missing stays null so the caller
 * leaves that field for manual entry. Never throws on messy OCR text.
 *
 * This is the FREE on-device "AI scan": tesseract.js OCR plus smart
 * extraction (vendor + category suggestion). There is deliberately NO
 * paid vision API call here — no API keys, no per-scan cost.
 *
 * FUTURE PLUG-IN POINT: a paid vision provider can later replace or
 * augment this parser. It must return the same ReceiptScan shape below
 * (amount, date, vendor, category) and stay editable in the review
 * screen — no other call site needs to change.
 */

export type SuggestedCategory = "diesel" | "repair" | "toll" | "food" | "other";

export interface ReceiptScan {
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  vendor: string | null;
  /** Null = no confident signal; the caller keeps the current category. */
  category: SuggestedCategory | null;
}

const AMOUNT_RE = /\$?\s?(\d{1,3}(?:,\d{3})*\.\d{2})/g;
// French-style decimal comma: "45,99" or "1 850,99" (never matches an
// English thousands group like "1,850.00" — the comma must be followed
// by exactly two digits and no further digit).
const AMOUNT_COMMA_RE = /(\d{1,3}(?:[ .]\d{3})*,\d{2})(?!\d)/g;

function parseAmountCandidates(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0 && n < 100000) out.push(n);
  }
  for (const m of text.matchAll(AMOUNT_COMMA_RE)) {
    const n = parseFloat(m[1].replace(/[ .]/g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0 && n < 100000) out.push(n);
  }
  return out;
}

/** Pick the receipt total: an amount on a line mentioning "total" wins,
 * otherwise the largest amount on the receipt (totals are usually biggest). */
function pickAmount(text: string): number | null {
  const lines = text.split("\n");
  for (const line of lines) {
    if (/total|amount due|balance due|montant total|total à payer/i.test(line)) {
      const cands = parseAmountCandidates(line);
      if (cands.length > 0) return Math.max(...cands);
    }
  }
  const all = parseAmountCandidates(text);
  return all.length > 0 ? Math.max(...all) : null;
}

function validISO(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt > today) return null; // a receipt date can't be in the future
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Month names in English and French (receipts in Québec/Ontario use both).
 * Tokens are accent-stripped and lowercased before lookup, so "févr.",
 * "Fevr", "aout" and "août" all resolve.
 */
const MONTH_NUMBERS: Record<string, number> = {
  jan: 1, janv: 1,
  feb: 2, fevr: 2,
  mar: 3, mars: 3,
  apr: 4, avr: 4,
  may: 5, mai: 5,
  jun: 6, juin: 6,
  jul: 7, juil: 7,
  aug: 8, aout: 8,
  sep: 9, sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function monthNum(token: string): number | undefined {
  const norm = token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "");
  return MONTH_NUMBERS[norm] ?? MONTH_NUMBERS[norm.slice(0, 3)];
}

function pickDate(text: string): string | null {
  // ISO: 2026-10-23 (also with slashes).
  let m = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const iso = validISO(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) return iso;
  }
  // North-American numeric: 10/23/2026 or 10-23-2026. If the first number
  // cannot be a month (> 12), fall back to day-first (23/10/2026), which
  // some Canadian receipts use.
  m = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const iso =
      validISO(Number(m[3]), first, second) ??
      (first > 12 ? validISO(Number(m[3]), second, first) : null);
    if (iso) return iso;
  }
  // "Oct 23, 2026" / "23 Oct 2026" / "23 oct. 2026" (EN + FR month names).
  m = text.match(/([A-Za-zÀ-ÿ]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m) {
    const mo = monthNum(m[1]);
    if (mo !== undefined) {
      const iso = validISO(Number(m[3]), mo, Number(m[2]));
      if (iso) return iso;
    }
  }
  m = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-zÀ-ÿ]+)\.?,?\s+(\d{4})/);
  if (m) {
    const mo = monthNum(m[2]);
    if (mo !== undefined) {
      const iso = validISO(Number(m[3]), mo, Number(m[1]));
      if (iso) return iso;
    }
  }
  return null;
}

/** Accent-strip + lowercase, for brand/keyword matching across EN + FR. */
function normLine(line: string): string {
  return line
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface Brand {
  match: string[];
  display: string;
  /** Forced category for this vendor; null = decide from keywords. */
  category: SuggestedCategory | null;
}

// Fuel brands force Diesel; food brands force Food; repair brands force
// Repair. Neutral vendors (Canadian Tire, Costco) give a name only —
// their receipts could be fuel, parts, or food, so keywords decide.
const BRANDS: Brand[] = [
  { match: ["petro-canada", "petro canada"], display: "Petro-Canada", category: "diesel" },
  { match: ["esso"], display: "Esso", category: "diesel" },
  { match: ["shell"], display: "Shell", category: "diesel" },
  { match: ["mobil"], display: "Mobil", category: "diesel" },
  { match: ["ultramar"], display: "Ultramar", category: "diesel" },
  { match: ["husky"], display: "Husky", category: "diesel" },
  { match: ["irving"], display: "Irving", category: "diesel" },
  { match: ["flying j"], display: "Flying J", category: "diesel" },
  { match: ["pilot"], display: "Pilot", category: "diesel" },
  { match: ["loves"], display: "Love's", category: "diesel" },
  { match: ["petro-pass", "petro pass"], display: "Petro-Pass", category: "diesel" },
  { match: ["fas gas"], display: "Fas Gas", category: "diesel" },
  { match: ["tim hortons"], display: "Tim Hortons", category: "food" },
  { match: ["mcdonald"], display: "McDonald's", category: "food" },
  { match: ["subway"], display: "Subway", category: "food" },
  { match: ["harvey"], display: "Harvey's", category: "food" },
  { match: ["burger king"], display: "Burger King", category: "food" },
  { match: ["wendy"], display: "Wendy's", category: "food" },
  { match: ["starbucks"], display: "Starbucks", category: "food" },
  { match: ["second cup"], display: "Second Cup", category: "food" },
  { match: ["pizza pizza"], display: "Pizza Pizza", category: "food" },
  { match: ["domino"], display: "Domino's", category: "food" },
  { match: ["kal tire"], display: "Kal Tire", category: "repair" },
  { match: ["fountain tire"], display: "Fountain Tire", category: "repair" },
  { match: ["ok tire"], display: "OK Tire", category: "repair" },
  { match: ["mr lube"], display: "Mr. Lube", category: "repair" },
  { match: ["jiffy lube"], display: "Jiffy Lube", category: "repair" },
  { match: ["midas"], display: "Midas", category: "repair" },
  { match: ["canadian tire"], display: "Canadian Tire", category: null },
  { match: ["costco"], display: "Costco", category: null },
  { match: ["couche-tard", "couche tard"], display: "Couche-Tard", category: null },
  { match: ["circle k"], display: "Circle K", category: null },
  { match: ["7-eleven", "7 eleven"], display: "7-Eleven", category: null },
  { match: ["walmart"], display: "Walmart", category: null },
  { match: ["home depot"], display: "Home Depot", category: null },
];

// Lines that are never a vendor name (totals, taxes, greetings, addresses,
// and item descriptions like "CARBURANT" or "RÉPARATION FREINS").
const NON_VENDOR_RE =
  /total|subtotal|tax|tps|tvq|hst|gst|amount due|balance due|change|cash|debit|credit|receipt|facture|merci|thank|welcome|bienvenue|phone|tel\.|address|adresse|\d{3}[- ]\d{3}[- ]\d{4}|www\.|\.com|\.ca\b|carburant|diesel|essence|pneu|reparation|peage|vidange|huile|freins|montant/;

/** Vendor = first known brand on the receipt, else the first name-like
 * line (usually the header). A generic name needs a multi-line receipt
 * and a capital letter — so single-line gibberish is never a vendor.
 * Returns null when nothing looks like a name. */
function pickVendor(text: string): { name: string; brand: Brand | null } | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const n = normLine(line);
    for (const brand of BRANDS) {
      if (brand.match.some((m) => n.includes(m))) {
        return { name: brand.display, brand };
      }
    }
  }
  if (lines.length < 2) return null;
  for (const line of lines) {
    const n = normLine(line);
    if (NON_VENDOR_RE.test(n)) continue;
    if (!/[A-ZÀ-Þ]/.test(line)) continue;
    const letters = (line.match(/[A-Za-zÀ-ÿ]/g) || []).length;
    if (line.length < 3 || line.length > 48) continue;
    if (letters / line.length < 0.6) continue;
    return { name: line.replace(/[.,;:\-]+$/, "").trim(), brand: null };
  }
  return null;
}

const TOLL_RE = /\btoll\b|peage|\betr\b|407\s*etr|autoroute a peage/;
const REPAIR_RE =
  /\btire\b|pneu|brake|frein|oil change|vidange|huile|repair|reparation|reparer|mechanic|mecanicien|alignment|alignement|battery|batterie|windshield|pare-brise|muffler|echappement|transmission|engine|moteur|garage|parts|piece|inspection|freins|rotation|antigel|coolant/;
const FOOD_RE =
  /restaurant|cafe|coffee|tim hortons|mcdonald|subway|harvey|burger|pizza|grocery|epicerie|supermarche|food|nourriture|dejeuner|lunch|dinner|souper|breakfast|petit dejeuner|pizzeria|boulangerie|bakery|poutine|sandwich/;
const DIESEL_RE =
  /\bdiesel\b|carburant|gasoline|essence|\bfuel\b|litre|litres|\$\s?\d+\.\d{3}\s*\/\s*l|\d+\s*l\s*@/;

/** Category suggestion, most-specific signal first. A forced brand
 * category wins; otherwise toll > repair > food > diesel keywords. */
function pickCategory(
  text: string,
  brand: Brand | null
): SuggestedCategory | null {
  if (brand?.category) return brand.category;
  const n = normLine(text);
  if (TOLL_RE.test(n)) return "toll";
  if (REPAIR_RE.test(n)) return "repair";
  if (FOOD_RE.test(n)) return "food";
  if (DIESEL_RE.test(n)) return "diesel";
  return null;
}

export function parseReceiptText(text: string): ReceiptScan {
  if (!text) return { amount: null, date: null, vendor: null, category: null };
  const vendor = pickVendor(text);
  return {
    amount: pickAmount(text),
    date: pickDate(text),
    vendor: vendor?.name ?? null,
    category: pickCategory(text, vendor?.brand ?? null),
  };
}
