"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { IncomeEntry, Account } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format-currency";
import { formatDatabaseDate } from "@/lib/date-utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Building, User, FileText, CreditCard, ArrowLeft, Landmark } from "lucide-react";

interface IncomeDetailViewProps {
  incomeId: string;
  onBack: () => void;
}

export function IncomeDetailView({ incomeId, onBack }: IncomeDetailViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [income, setIncome] = useState<IncomeEntry | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncomeDetails = async () => {
      try {
        setIsLoading(true);

        // First, fetch the income entry
        console.log("Fetching income with ID:", incomeId);
        const { data: incomeData, error: incomeError } = await supabase
          .from("income_entries")
          .select("*")
          .eq("id", incomeId)
          .single();

        if (incomeError) {
          console.error("Supabase income error:", incomeError);
          throw incomeError;
        }

        console.log("Income data received:", incomeData);

        if (!incomeData) {
          throw new Error("No income data found");
        }

        // Then, if there's a category_id, fetch the category
        let categoryData = null;
        if (incomeData.category_id) {
          console.log("Fetching category with ID:", incomeData.category_id);
          const { data: catData, error: catError } = await supabase
            .from("income_categories")
            .select("id, name")
            .eq("id", incomeData.category_id)
            .single();

          if (catError) {
            console.error("Category fetch error:", catError);
            // Don't throw here, just log the error
          } else {
            categoryData = catData;
            console.log("Category data received:", categoryData);
          }
        }

        // Then, if there's an account_id, fetch the account
        let accountData = null;
        if (incomeData.account_id) {
          console.log("Fetching account with ID:", incomeData.account_id);
          const { data: accData, error: accError } = await supabase
            .from("accounts")
            .select("*")
            .eq("id", incomeData.account_id)
            .single();

          if (accError) {
            console.error("Account fetch error:", accError);
            // Don't throw here, just log the error
          } else {
            accountData = accData;
            console.log("Account data received:", accountData);
          }
        }

        // Format the data
        const formattedIncome: IncomeEntry = {
          ...incomeData,
          category: categoryData,
          account: accountData,
        };

        console.log("Formatted income:", formattedIncome);
        setIncome(formattedIncome);
        setAccount(accountData);
      } catch (err) {
        console.error("Error fetching income details:", err);
        setError("Failed to load income details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncomeDetails();
  }, [incomeId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !income) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">{error || "Income entry not found"}</p>
              <Button variant="outline" className="mt-4" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Income Details</h2>
          <p className="text-muted-foreground">
            {income.category?.name || "Unknown Category"} - {formatDatabaseDate(income.date)}
          </p>
        </div>
      </div>

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{income.description || income.category?.name || "Income Entry"}</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {formatDatabaseDate(income.date)}
                </span>
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-blue-500 text-white text-md px-3 py-1">
              {formatCurrency(income.amount)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" /> Category
              </p>
              <p className="text-sm font-semibold">
                {income.category?.name || "Uncategorized"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment Method
              </p>
              <p className="text-sm font-semibold">
                {income.payment_method || "Not specified"}
              </p>
            </div>

            {account && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Landmark className="h-3 w-3" /> Account
                </p>
                <p className="text-sm font-semibold">
                  {account.name}
                  {account.bank_name && ` (${account.bank_name})`}
                </p>
              </div>
            )}

            {income.source && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Source
                </p>
                <p className="text-sm font-semibold">
                  {income.source}
                </p>
              </div>
            )}

            {income.description && (
              <div className="col-span-2 space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Description
                </p>
                <p className="text-sm">
                  {income.description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to List
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
