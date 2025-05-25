"use client";

import { useState, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeCategorySettings } from "@/components/settings/finance/income-category-settings";
import { ExpenseCategorySettings } from "@/components/settings/finance/expense-category-settings";
import { LiabilityCategorySettings } from "@/components/settings/finance/liability-category-settings";
import { AccountsSettings } from "@/components/settings/finance/accounts-settings";
import {
  CategorySettingsSkeleton,
  AccountsSettingsSkeleton
} from "@/components/settings/finance/finance-settings-skeleton";

export function FinanceSettings() {
  const [activeTab, setActiveTab] = useState("income-category");

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">Finance Settings</h1>

        <Tabs
          defaultValue="income-category"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6 flex overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
            <TabsTrigger value="income-category" className="whitespace-nowrap">
              Income Category
            </TabsTrigger>
            <TabsTrigger value="expense-category" className="whitespace-nowrap">
              Expense Category
            </TabsTrigger>
            <TabsTrigger value="liability-category" className="whitespace-nowrap">
              Liability Category
            </TabsTrigger>
            <TabsTrigger value="accounts" className="whitespace-nowrap">
              Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income-category">
            <Suspense fallback={<CategorySettingsSkeleton />}>
              <IncomeCategorySettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="expense-category">
            <Suspense fallback={<CategorySettingsSkeleton />}>
              <ExpenseCategorySettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="liability-category">
            <Suspense fallback={<CategorySettingsSkeleton />}>
              <LiabilityCategorySettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="accounts">
            <Suspense fallback={<AccountsSettingsSkeleton />}>
              <AccountsSettings />
            </Suspense>
          </TabsContent>


        </Tabs>
      </div>
    </Card>
  );
}
