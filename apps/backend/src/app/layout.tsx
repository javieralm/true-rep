import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueRep — Calisthenics Training",
  description:
    "Subscription-based calisthenics training with expert routines, gamification, community challenges, and AI-powered form feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-[#1A1A1A] antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
