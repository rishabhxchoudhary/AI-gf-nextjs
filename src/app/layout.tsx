import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "AI Girlfriend - Your Personal AI Companion",
  description:
    "Experience a genuine connection with an AI that remembers, learns, and grows with you",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  keywords: ["AI girlfriend", "AI companion", "artificial intelligence", "chat bot", "virtual girlfriend"],
  authors: [{ name: "AI Girlfriend Team" }],
  creator: "AI Girlfriend",
  publisher: "AI Girlfriend",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "AI Girlfriend - Your Personal AI Companion",
    description: "Experience a genuine connection with an AI that remembers, learns, and grows with you",
    url: "https://ai-girlfriend.app",
    siteName: "AI Girlfriend",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Girlfriend - Your Personal AI Companion",
    description: "Experience a genuine connection with an AI that remembers, learns, and grows with you",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} light`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <TRPCReactProvider>
          <Providers>
            {children}
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
