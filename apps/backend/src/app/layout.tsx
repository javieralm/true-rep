import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueRep — Plataforma para entrenadores de calistenia",
  description: "Programas, progreso y cobros de tus clientes de calistenia en un solo sitio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      {/* lang="es": el dashboard está en español y los lectores de pantalla
          necesitan el idioma correcto para pronunciarlo bien. */}
      <html lang="es">
        <body className="bg-white text-[#1A1A1A] antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
