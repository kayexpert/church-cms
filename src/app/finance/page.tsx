import { FinanceContent } from "@/components/finance/finance-content";
import { Suspense } from "react";
import { FinanceSkeleton } from "@/components/finance";

export const metadata = {
  title: "Finance Dashboard",
  description: "Financial overview and analytics",
};

export default function FinancePage() {
  return (
    <>
      <Suspense fallback={<FinanceSkeleton />}>
        <FinanceContent />
      </Suspense>
    </>
  );
}
