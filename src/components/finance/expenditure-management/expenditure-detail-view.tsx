"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ExpenditureEntry, Account } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format-currency";
import { LinkedBudgetItem } from "./linked-budget-item";

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
import { CalendarIcon, Building, User, FileText, CreditCard, ArrowLeft } from "lucide-react";

interface ExpenditureDetailViewProps {
  expenditureId: string;
  onBack: () => void;
}

export function ExpenditureDetailView({ expenditureId, onBack }: ExpenditureDetailViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [expenditure, setExpenditure] = useState<ExpenditureEntry | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpenditureDetails = async () => {
      try {
        setIsLoading(true);
        
        // Fetch the expenditure entry with related data
        const { data, error } = await supabase
          .from("expenditure_entries")
          .select(`
            *,
            expenditure_categories(id, name),
            accounts(*)
          `)
          .eq("id", expenditureId)
          .single();
        
        if (error) {
          throw error;
        }
        
        // Format the data
        const formattedExpenditure: ExpenditureEntry = {
          ...data,
          category: data.expenditure_categories,
          account: data.accounts,
        };
        
        setExpenditure(formattedExpenditure);
        setAccount(data.accounts);
      } catch (err) {
        console.error("Error fetching expenditure details:", err);
        setError("Failed to load expenditure details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExpenditureDetails();
  }, [expenditureId]);
  
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
  
  if (error || !expenditure) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">{error || "Expenditure not found"}</p>
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
          <h2 className="text-xl font-bold tracking-tight">Expenditure Details</h2>
          <p className="text-muted-foreground">
            {expenditure.category?.name || "Unknown Category"} - {format(new Date(expenditure.date), "MMMM d, yyyy")}
          </p>
        </div>
      </div>
      
      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{expenditure.description}</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(new Date(expenditure.date), "MMMM d, yyyy")}
                </span>
              </CardDescription>
            </div>
            <Badge variant="destructive" className="text-md px-3 py-1">
              {formatCurrency(expenditure.amount)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment Method
              </p>
              <p className="text-sm font-semibold capitalize">{expenditure.payment_method}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" /> Account
              </p>
              <p className="text-sm font-semibold">
                {account ? account.name : "No account specified"}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Category
              </p>
              <p className="text-sm font-semibold">
                {expenditure.category?.name || "Unknown Category"}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Recipient
              </p>
              <p className="text-sm font-semibold">
                {expenditure.recipient || "Not specified"}
              </p>
            </div>
          </div>
          
          {/* Show linked budget item if available */}
          <LinkedBudgetItem expenditureEntry={expenditure} />
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
