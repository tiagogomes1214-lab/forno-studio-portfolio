import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Forno Studio — Pizza feita com tempo", description: "Pizza artesanal, fermentação lenta e ingredientes de verdade." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
