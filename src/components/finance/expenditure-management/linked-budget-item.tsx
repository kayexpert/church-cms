"use client";

import { useState, useEffect } from "react";
import { ExpenditureEntry, BudgetItem, Budget } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format-currency";
import { format } from "date-fns";
import { ArrowUpRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface LinkedBudgetItemProps {
  expenditureEntry: ExpenditureEntry;
}

export function LinkedBudgetItem({ expenditureEntry }: LinkedBudgetItemProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [budgetItem, setBudgetItem] = useState<BudgetItem | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinkedBudgetItem = async () => {
      if (!expenditureEntry.budget_item_id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch the budget item
        const { data: budgetItemData, error: budgetItemError } = await supabase
          .from("budget_items")
          .select("*")
          .eq("id", expenditureEntry.budget_item_id)
          .single();
        
        if (budgetItemError) {
          throw budgetItemError;
        }
        
        setBudgetItem(budgetItemData);
        
        // Fetch the budget
        if (budgetItemData.budget_id) {
          const { data: budgetData, error: budgetError } = await supabase
            .from("budgets")
            .select("*")
            .eq("id", budgetItemData.budget_id)
            .single();
          
          if (budgetError) {
            throw budgetError;
          }
          
          setBudget(budgetData);
        }
      } catch (err) {
        console.error("Error fetching linked budget item:", err);
        setError("Failed to load linked budget information");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLinkedBudgetItem();
  }, [expenditureEntry.budget_item_id]);
  
  if (!expenditureEntry.budget_item_id) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Linked Budget</h3>
        <Skeleton className="h-[100px] w-full" />
      </div>
    );
  }
  
  if (error || !budgetItem) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Linked Budget</h3>
        <div className="text-sm text-muted-foreground">
          {error || "No linked budget information found"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Linked Budget</h3>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base">{budget?.title || "Unknown Budget"}</CardTitle>
              <CardDescription>
                {budget ? (
                  <span className="flex items-center gap-1 text-xs">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(budget.start_date), "MMM d, yyyy")} - {format(new Date(budget.end_date), "MMM d, yyyy")}
                  </span>
                ) : "Budget details unavailable"}
              </CardDescription>
            </div>
            <Badge variant={budgetItem.category_type === "income" ? "success" : "destructive"}>
              {budgetItem.category_type === "income" ? "Income" : "Expenditure"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Amount:</p>
              <p className="font-medium">{formatCurrency(budgetItem.planned_amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual:</p>
              <p className="font-medium">{formatCurrency(budgetItem.actual_amount)}</p>
            </div>
          </div>
          {budgetItem.description && (
            <div className="mt-2">
              <p className="text-muted-foreground text-xs">Description:</p>
              <p className="text-sm">{budgetItem.description}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => {
              // Navigate to budget detail view
              if (budget) {
                window.location.href = `/finance/budget?id=${budget.id}`;
              }
            }}
          >
            View Budget <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
