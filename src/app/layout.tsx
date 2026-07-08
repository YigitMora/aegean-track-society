import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TestModeBanner } from "@/components/test-mode-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegean Track Days",
  description: "Motorsport track day events and participant registration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TestModeBanner />
        {children}
      </body>
    </html>
  );
}
