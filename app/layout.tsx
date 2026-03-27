import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// This loads the font cleanly without breaking CSS compilers
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Brainboard | Curate your thoughts",
  description: "A beautiful, tactile workspace designed for teams to capture links, ideas, and media.",
};

// EXPORT VIEWPORT SEPARATELY (Fixes Next.js 14/15 errors)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents input zoom on iOS
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#09090B" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="antialiased bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}