"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  STRINGS,
  dateLocale,
  resolveLocale,
  type Locale,
  type Strings,
} from "@/lib/strings";

const LANG_KEY = "fd-lang";

interface LocaleCtx {
  lang: Locale;
  t: Strings;
  /** BCP 47 locale for dates/currency ("en-CA" or "fr-CA"). */
  locale: string;
  setLang: (l: Locale) => void;
}

const Ctx = createContext<LocaleCtx>({
  lang: "en",
  t: STRINGS.en,
  locale: "en-CA",
  setLang: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(LANG_KEY) ??
        document.cookie
          .split("; ")
          .find((c) => c.startsWith(`${LANG_KEY}=`))
          ?.split("=")[1];
      if (saved) setLangState(resolveLocale(decodeURIComponent(saved)));
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((l: Locale) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
      document.cookie = `${LANG_KEY}=${l}; path=/; max-age=31536000`;
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Ctx.Provider
      value={{ lang, t: STRINGS[lang], locale: dateLocale(lang), setLang }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLocale() {
  return useContext(Ctx);
}

/** EN | FR toggle. Reuses the existing .lang-toggle styles. */
export function LangToggle() {
  const { lang, setLang, t } = useLocale();
  const opts: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
  ];
  return (
    <div className="lang-toggle" role="group" aria-label={t.language}>
      {opts.map((o) => (
        <button
          key={o.code}
          type="button"
          className={lang === o.code ? "active" : ""}
          onClick={() => setLang(o.code)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
