"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { useState, useEffect } from "react";
import { useSettingsStore } from "@/lib/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Apply theme to document root when it changes
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  // Don't render until client-side hydration is complete
  if (!mounted) {
    return (
      <html lang="en" data-theme="architech">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" data-theme={theme}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
