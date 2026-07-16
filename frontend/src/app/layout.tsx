import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import AccessibilityMenu from "@/components/AccessibilityMenu";

export const metadata: Metadata = {
  title: "FanPulse AI — FIFA World Cup 2026 Operations",
  description: "AI-grounded operations platform, digital twin visualization, and companion for World Cup stadium management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#0b0c10] text-[#e5e7eb]">
        <AccessibilityProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <AccessibilityMenu />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
