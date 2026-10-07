import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PinCode Mart - Hyperlocal Marketplace",
  description: "Discover local shops, products, and services in your neighborhood",
  manifest: "/manifest.json",
  icons: {
    icon: "/assets/logoc.png",
    apple: "/assets/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
