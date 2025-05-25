import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/styles/hide-member-id.css"; // Import custom CSS to hide member IDs
import "@/styles/fonts.css"; // Import custom font CSS
import { nunito, lato } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { TimezoneProvider } from "@/components/timezone-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { MessagingProvider } from "@/contexts/messaging-context";
import { Toaster } from "@/components/ui/sonner";
import { ConnectionErrorBoundary } from "@/components/connection-error-boundary";

export const metadata: Metadata = {
  title: "Church Management System",
  description: "A comprehensive church management system for modern churches",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2236" }
  ],
};

// We'll use an external script for theme initialization
// This prevents any issues with inline scripts and ensures it runs before anything else

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload Nunito font */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap"
        />

        {/* Add the external theme script */}
        <script src="/theme-script.js" />

        {/* Add critical styles to prevent FOUC (Flash of Unstyled Content) */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Hide content until theme is initialized to prevent flash */
          html:not(.theme-initialized) body {
            visibility: hidden;
          }

          /* Default background colors */
          html {
            background-color: #ffffff;
            transition: background-color 0.2s ease-in-out;
          }
          html.dark {
            background-color: #1a2236;
          }
          html.light {
            background-color: #ffffff;
          }

          /* Prevent flash during theme change */
          .no-transitions * {
            transition: none !important;
          }

          /* Ensure Nunito font is applied */
          html, body {
            font-family: var(--font-nunito);
          }
        `}} />
      </head>
      <body
        className={`${nunito.variable} ${lato.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TimezoneProvider>
            <ConnectionErrorBoundary>
              <AuthProvider>
                <QueryProvider>
                  <MessagingProvider>
                    {children}
                    <Toaster />
                  </MessagingProvider>
                </QueryProvider>
              </AuthProvider>
            </ConnectionErrorBoundary>
          </TimezoneProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
