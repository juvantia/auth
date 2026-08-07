import type { Metadata } from "next";
import { Cinzel, Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { SuperTokensProvider } from "@/components/auth/SuperTokensProvider";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Auth | JUVANTIA",
  description: "Secure Identity & Account Center for the Juvantia Ecosystem",
  icons: {
    icon: "/favicon_io/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
  },
  manifest: "/favicon_io/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${spaceGrotesk.variable} ${inter.variable} antialiased`}
    >
      <body>
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
