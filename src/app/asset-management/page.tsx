import { AssetManagement } from "@/components/assets";
import { Layout } from "@/components/layout";
import { Suspense } from "react";
import { AssetManagementSkeleton } from "@/components/assets";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asset Management | Church Management System",
  description: "Manage church assets and disposals",
};

export default function AssetManagementPage() {
  return (
    <Layout title="Asset Management">
      <Suspense fallback={<AssetManagementSkeleton />}>
        <AssetManagement />
      </Suspense>
    </Layout>
  );
}
