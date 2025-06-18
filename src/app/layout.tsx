import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { DatabaseProvider } from "@/components/providers/DatabaseProvider";
import { ModalProvider } from "@/components/providers/ModalProvider";

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
  return (
    <html lang="en" data-theme="architech">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <DatabaseProvider>
            <ToastProvider position="bottom-right" maxToasts={5}>
              <ModalProvider />
              {children}
            </ToastProvider>
          </DatabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
