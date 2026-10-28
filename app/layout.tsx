import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/locale";

export const metadata: Metadata = {
  title: "MileMoney — Driver Expense Tracker",
  description:
    "Daily expense tracker for drivers and owner-operators: receipt scan, category totals, monthly PDF.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
