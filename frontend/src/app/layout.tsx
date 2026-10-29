import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://forno-studio-portfolio-seven.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Forno Studio — Pizza feita com tempo",
    template: "%s | Forno Studio",
  },
  description: "Uma experiência de pizzaria artesanal: massa de longa fermentação, ingredientes selecionados e receitas autorais.",
  applicationName: "Forno Studio",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Forno Studio",
    title: "Forno Studio — Pizza feita com tempo",
    description: "Massa de longa fermentação, ingredientes de verdade e o prazer de sentar à mesa sem pressa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forno Studio — Pizza feita com tempo",
    description: "Pizza artesanal, receitas autorais e ingredientes selecionados.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2eee5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
