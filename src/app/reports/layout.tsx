import { Layout } from "@/components/layout";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Reports | Church Management System",
  description: "Church Management System reports generation",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2236" }
  ],
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout title="Reports">
      {children}
    </Layout>
  );
}
