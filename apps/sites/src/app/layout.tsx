import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Velozy Sites",
  icons: {
    icon: [
      { url: "/brand/favicon/favicon.ico", sizes: "any" },
      { url: "/brand/favicon/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/brand/favicon/apple-touch-icon.png",
  },
  manifest: "/brand/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
