"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { LiabilityEntry, LiabilityCategory } from "@/types/finance";
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
import { CalendarIcon, Building, User, FileText, CreditCard, ArrowLeft, Clock } from "lucide-react";

interface LiabilityDetailViewProps {
  liabilityId: string;
  onBack: () => void;
}

export function LiabilityDetailView({ liabilityId, onBack }: LiabilityDetailViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [liability, setLiability] = useState<LiabilityEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiabilityDetails = async () => {
      try {
        setIsLoading(true);

        // First, fetch the liability entry
        console.log("Fetching liability with ID:", liabilityId);
        const { data: liabilityData, error: liabilityError } = await supabase
          .from("liability_entries")
          .select("*")
          .eq("id", liabilityId)
          .single();

        if (liabilityError) {
          console.error("Supabase liability error:", liabilityError);
          throw liabilityError;
        }

        console.log("Liability data received:", liabilityData);

        if (!liabilityData) {
          throw new Error("No liability data found");
        }

        // Then, if there's a category_id, fetch the category
        let categoryData = null;
        if (liabilityData.category_id) {
          console.log("Fetching category with ID:", liabilityData.category_id);
          const { data: catData, error: catError } = await supabase
            .from("liability_categories")
            .select("id, name")
            .eq("id", liabilityData.category_id)
            .single();

          if (catError) {
            console.error("Category fetch error:", catError);
            // Don't throw here, just log the error
          } else {
            categoryData = catData;
            console.log("Category data received:", categoryData);
          }
        }

        // Format the data
        const formattedLiability: LiabilityEntry = {
          ...liabilityData,
          category: categoryData,
        };

        console.log("Formatted liability:", formattedLiability);
        setLiability(formattedLiability);
      } catch (err) {
        console.error("Error fetching liability details:", err);
        setError("Failed to load liability details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiabilityDetails();
  }, [liabilityId]);

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

  if (error || !liability) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">{error || "Liability not found"}</p>
              <Button variant="outline" className="mt-4" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'unpaid':
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Liability Details</h2>
          <p className="text-muted-foreground">
            {liability.category?.name || "Unknown Category"} - {formatDatabaseDate(liability.date)}
          </p>
        </div>
      </div>

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{liability.creditor_name}</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {formatDatabaseDate(liability.date)}
                </span>
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={`text-md px-3 py-1 ${getStatusColor(liability.status)}`}>
                {liability.status.toUpperCase()}
              </Badge>
              <Badge variant="destructive" className="text-md px-3 py-1">
                {formatCurrency(liability.total_amount)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Creditor
              </p>
              <p className="text-sm font-semibold">
                {liability.creditor_name}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" /> Category
              </p>
              <p className="text-sm font-semibold">
                {liability.category?.name || "Uncategorized"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Total Amount
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(liability.total_amount)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Amount Paid
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(liability.amount_paid)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Amount Remaining
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(liability.amount_remaining)}
              </p>
            </div>

            {liability.due_date && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Due Date
                </p>
                <p className="text-sm font-semibold">
                  {formatDatabaseDate(liability.due_date)}
                </p>
              </div>
            )}

            {liability.last_payment_date && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last Payment Date
                </p>
                <p className="text-sm font-semibold">
                  {formatDatabaseDate(liability.last_payment_date)}
                </p>
              </div>
            )}

            <div className="col-span-2 space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Details
              </p>
              <p className="text-sm">
                {liability.details || "No additional details provided"}
              </p>
            </div>
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
