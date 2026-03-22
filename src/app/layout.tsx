import type { Metadata } from "next";
import "./globals.css";
import { ClientTokenProvider } from "@/components/ClientTokenProvider";

export const metadata: Metadata = {
  title: "Bagdja Console",
  description: "Control center for Bagdja",
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <ClientTokenProvider>
        {children}
        </ClientTokenProvider>
      </body>
    </html>
  );
}
