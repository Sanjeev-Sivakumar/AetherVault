import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AetherVault — AICTE Security Deposit & FDR Management Portal",
  description:
    "Official Centralized Portal for AICTE Regulation Bureau for security deposit and fixed deposit receipt (FDR) lifecycle management, verification, and audit tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#eef1f5]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col text-slate-800 bg-[#eef1f5] antialiased">
        {children}
      </body>
    </html>
  );
}
