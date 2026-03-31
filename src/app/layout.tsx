import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BesserLernen - Almanca Öğrenme",
  description:
    "Spaced Repetition ile Almanca kelime ve gramer öğrenme uygulaması",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366F1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Providers>
          <div className="mx-auto max-w-lg min-h-screen bg-white dark:bg-gray-800 shadow-sm lg:max-w-6xl">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
