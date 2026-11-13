import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub AI Workspace",
  description: "Production-quality, local-first GitHub management and coding agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        {children}
      </body>
    </html>
  );
}
