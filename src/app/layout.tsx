import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TestModeBanner } from "@/components/test-mode-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegean Track Society",
  description: "Organize, güvenli ve premium pist günü deneyimleri.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <TestModeBanner />
        {children}
      </body>
    </html>
  );
}
