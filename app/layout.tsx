import type { Metadata } from "next";
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