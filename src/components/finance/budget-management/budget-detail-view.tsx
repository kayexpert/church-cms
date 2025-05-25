"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import { Budget, BudgetItem, IncomeCategory, ExpenditureCategory, Account } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { filterSystemIncomeCategories } from "@/lib/identify-system-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useBudgetItemMutations } from "@/hooks/use-budget-items";
import { useQuery } from "@tanstack/react-query";
import { financeKeys } from "@/lib/query-keys";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-utils";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BudgetItemForm } from "./budget-item-form";
import { Progress } from "@/components/ui/progress";

interface BudgetDetailViewProps {
  budget: Budget;
  onBack: () => void;
  onRefresh: () => void;
}

export function BudgetDetailView({ budget, onBack, onRefresh }: BudgetDetailViewProps) {
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenditureCategories, setExpenditureCategories] = useState<ExpenditureCategory[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use optimized hooks for data fetching
  const { data: accounts = [] } = useAccounts();

  // Add a refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Use the updated budget items hook with refresh trigger
  const {
    data: budgetItemsData = [],
    isLoading: isLoadingBudgetItems,
    refetch: refetchBudgetItems
  } = useQuery({
    queryKey: [...financeKeys.budgets.items(budget.id), refreshTrigger],
    queryFn: async () => {
      // Fetch budget items
      const { data: basicItemsData, error: basicItemsError } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budget.id);

      if (basicItemsError) throw basicItemsError;

      // Fetch categories in parallel for all items
      const incomeItemIds = basicItemsData?.filter(item => item.category_type === "income").map(item => item.category_id) || [];
      const expenditureItemIds = basicItemsData?.filter(item => item.category_type === "expenditure").map(item => item.category_id) || [];

      // Fetch all needed categories in batch to reduce API calls
      const [incomeCategories, expenditureCategories] = await Promise.all([
        incomeItemIds.length > 0
          ? supabase.from("income_categories").select("id, name").in("id", incomeItemIds).then(res => res.data || [])
          : Promise.resolve([]),
        expenditureItemIds.length > 0
          ? supabase.from("expenditure_categories").select("id, name").in("id", expenditureItemIds).then(res => res.data || [])
          : Promise.resolve([])
      ]);

      // Create lookup maps for faster access
      const incomeCategoryMap = new Map(incomeCategories.map(cat => [cat.id, cat]));
      const expenditureCategoryMap = new Map(expenditureCategories.map(cat => [cat.id, cat]));

      // Enhance items with their categories
      const enhancedItems = (basicItemsData || []).map(item => {
        if (item.category_type === "income") {
          return {
            ...item,
            income_categories: incomeCategoryMap.get(item.category_id) || { name: "Unknown" }
          };
        } else {
          return {
            ...item,
            expenditure_categories: expenditureCategoryMap.get(item.category_id) || { name: "Unknown" }
          };
        }
      });

      return enhancedItems;
    },
    staleTime: STALE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });

  // Fetch categories for the form
  const {
    data: incomeCategoriesData = [],
    isLoading: isLoadingIncomeCategories
  } = useQuery({
    queryKey: financeKeys.income.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIMES.STATIC, // Categories change less frequently
    gcTime: GC_TIMES.EXTENDED,
  });

  // Fetch expenditure categories
  const {
    data: expenditureCategoriesData = [],
    isLoading: isLoadingExpenditureCategories
  } = useQuery({
    queryKey: financeKeys.expenditure.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenditure_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIMES.STATIC, // Categories change less frequently
    gcTime: GC_TIMES.EXTENDED,
  });

  // Update all state values in a single useEffect to prevent infinite loops
  useEffect(() => {
    // Only update if we have data and it's different from current state
    if (incomeCategoriesData && incomeCategoriesData !== incomeCategories) {
      setIncomeCategories(incomeCategoriesData);
    }

    if (expenditureCategoriesData && expenditureCategoriesData !== expenditureCategories) {
      setExpenditureCategories(expenditureCategoriesData);
    }

    if (budgetItemsData && JSON.stringify(budgetItemsData) !== JSON.stringify(budgetItems)) {
      setBudgetItems(budgetItemsData);
    }

    // Update loading state only if it's different from current state
    const isDataLoading = isLoadingBudgetItems || isLoadingIncomeCategories || isLoadingExpenditureCategories;
    if (isDataLoading !== isLoadingState) {
      setIsLoadingState(isDataLoading);
    }
  }, [
    incomeCategoriesData,
    expenditureCategoriesData,
    budgetItemsData,
    isLoadingBudgetItems,
    isLoadingIncomeCategories,
    isLoadingExpenditureCategories,
    // Include current state values to compare against
    incomeCategories,
    expenditureCategories,
    budgetItems,
    isLoadingState
  ]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵'); // Replace the default "GH₵" with just "₵"
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd-MMM-yy");
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "active":
        return "success";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Calculate budget summary with memoization to avoid recalculating on every render
  const budgetSummary = useMemo(() => ({
    totalPlanned: budgetItems.reduce((sum, item) => sum + item.planned_amount, 0),
    totalActual: budgetItems.reduce((sum, item) => sum + item.actual_amount, 0),
    totalVariance: budgetItems.reduce((sum, item) => sum + item.variance, 0),
    incomePlanned: budgetItems
      .filter(item => item.category_type === "income")
      .reduce((sum, item) => sum + item.planned_amount, 0),
    incomeActual: budgetItems
      .filter(item => item.category_type === "income")
      .reduce((sum, item) => sum + item.actual_amount, 0),
    expenditurePlanned: budgetItems
      .filter(item => item.category_type === "expenditure")
      .reduce((sum, item) => sum + item.planned_amount, 0),
    expenditureActual: budgetItems
      .filter(item => item.category_type === "expenditure")
      .reduce((sum, item) => sum + item.actual_amount, 0),
  }), [budgetItems]);

  // Calculate progress percentage
  const calculateProgress = (actual: number, planned: number) => {
    if (planned === 0) return 0;
    const progress = (actual / planned) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // Get budget item mutations
  const { deleteBudgetItem } = useBudgetItemMutations(budget.id);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    // Increment refresh trigger to force a refresh
    setRefreshTrigger(prev => prev + 1);

    // Also call the parent's onRefresh to update the budget list
    if (onRefresh) {
      onRefresh();
    }

    // Also manually refetch budget items
    refetchBudgetItems();
  }, [onRefresh, refetchBudgetItems]);

  // Handle add item success
  const handleItemAdded = useCallback(() => {
    setShowAddItemDialog(false);
    // Force refresh after adding an item
    forceRefresh();
  }, [forceRefresh]);

  // Handle delete button click
  const handleDeleteClick = useCallback((item: BudgetItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  }, []);

  // Handle delete confirmation
  const handleDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      await deleteBudgetItem.mutateAsync(itemToDelete.id);
      setShowDeleteDialog(false);
      // Force refresh after deleting an item
      forceRefresh();
    } catch (error) {
      console.error("Error deleting budget item:", error);
      toast.error("Failed to delete budget item");
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, deleteBudgetItem, forceRefresh]);

  return (
    <>
      <div className="space-y-6">
        {/* Header with back button and refresh button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{budget.title}</h2>
              <p className="text-muted-foreground">
                {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={forceRefresh}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Budget Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenditure">Expenditure</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Budget Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Summary</CardTitle>
                <CardDescription>
                  Overview of budget allocation and utilization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Total Budget */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl font-bold">{formatCurrency(budget.total_amount)}</div>
                      <p className="text-xs text-muted-foreground">
                        Allocated: {formatCurrency(budgetSummary.totalPlanned)} ({((budgetSummary.totalPlanned / budget.total_amount) * 100).toFixed(1)}%)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Income */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium">Income</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl font-bold">{formatCurrency(budgetSummary.incomePlanned)}</div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Actual: {formatCurrency(budgetSummary.incomeActual)}</span>
                          <span>{calculateProgress(budgetSummary.incomeActual, budgetSummary.incomePlanned).toFixed(0)}%</span>
                        </div>
                        <Progress value={calculateProgress(budgetSummary.incomeActual, budgetSummary.incomePlanned)} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expenditure */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium">Expenditure</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-2xl font-bold">{formatCurrency(budgetSummary.expenditurePlanned)}</div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Actual: {formatCurrency(budgetSummary.expenditureActual)}</span>
                          <span>{calculateProgress(budgetSummary.expenditureActual, budgetSummary.expenditurePlanned).toFixed(0)}%</span>
                        </div>
                        <Progress value={calculateProgress(budgetSummary.expenditureActual, budgetSummary.expenditurePlanned)} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Budget Description */}
                {budget.description && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{budget.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Items */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Budget Items</CardTitle>
                    <CardDescription>All budget allocations</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddItemDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {budgetItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No budget items found. Click "Add Item" to create your first budget allocation.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Source Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant={item.category_type === "income" ? "success" : "destructive"}>
                                {item.category_type === "income" ? "Income" : "Expenditure"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.category_type === "income" && item.account_id ? (
                                <span className="text-sm">
                                  {accounts.find(a => a.id === item.account_id)?.name || "Unknown Account"}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {item.category_type === "income" ? "No account" : "-"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {item.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.planned_amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(item)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Income Budget</CardTitle>
                    <CardDescription>Income allocations and actuals</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddItemDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Income Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {budgetItems.filter(item => item.category_type === "income").length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No income budget items found. Click "Add Income Item" to create your first income allocation.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetItems
                          .filter(item => item.category_type === "income")
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {item.account_id ? (
                                  <span className="text-sm">
                                    {accounts.find(a => a.id === item.account_id)?.name || "Unknown Account"}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No account</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {item.description || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.planned_amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(item)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenditure Tab */}
          <TabsContent value="expenditure" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Expenditure Budget</CardTitle>
                    <CardDescription>Expenditure allocations and actuals</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddItemDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expenditure Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {budgetItems.filter(item => item.category_type === "expenditure").length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No expenditure budget items found. Click "Add Expenditure Item" to create your first expenditure allocation.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetItems
                          .filter(item => item.category_type === "expenditure")
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="max-w-[200px] truncate">
                                {item.description || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.planned_amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(item)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Budget Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
            <DialogDescription>
              Add a new item to your budget
            </DialogDescription>
          </DialogHeader>
          <BudgetItemForm
            budgetId={budget.id}
            budgetTitle={budget.title}
            defaultCategoryType={activeTab === "income" ? "income" : activeTab === "expenditure" ? "expenditure" : undefined}
            onSuccess={handleItemAdded}
            onCancel={() => setShowAddItemDialog(false)}
          />
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this budget item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
