import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Velozy Builder",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider {...{ attribute: "class", defaultTheme: "system", enableSystem: true, disableTransitionOnChange: true, children }} />
      </body>
    </html>
  );
}
