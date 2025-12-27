import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "reply.",
  description: "Automatically reply to YouTube comments with smart keyword matching and human-like responses.",
  icons: {
    icon: '/reply_logo.jpg',
    shortcut: '/reply_logo.jpg',
    apple: '/reply_logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gray-950 text-white min-h-screen`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
