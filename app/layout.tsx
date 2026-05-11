import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CustomerProvider } from "@/lib/CustomerContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RouteMaker - 訪問ルート計画",
  description: "最適訪問ルートを作成",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <CustomerProvider>{children}</CustomerProvider>
      </body>
    </html>
  );
}
