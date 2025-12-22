import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "OutaCharge - Turkiye'nin Guvenilir Sarj Istasyonu Uygulamasi",
  description: "Gercek zamanli kullanici bildirimleri, arac bazli uyumluluk skorlari ve akilli rota planlama ile sarj istasyonuna gitmeden once durumunu bil.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}