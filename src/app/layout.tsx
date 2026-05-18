import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperFrames Render Studio",
  description: "Aplicacion web para generar y renderizar videos con HyperFrames."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
