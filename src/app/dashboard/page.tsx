import { Layout } from "@/components/layout";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Church Management System",
  description: "Church Management System dashboard",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2236" }
  ],
};

export default function DashboardPage() {
  return (
    <Layout title="Dashboard">
      <DashboardContent />
    </Layout>
  );
}
