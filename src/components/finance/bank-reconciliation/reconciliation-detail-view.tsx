"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { BankReconciliation, ReconciliationItem, IncomeEntry, ExpenditureEntry } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReconciliationItemForm } from "./reconciliation-item-form";
import { ReconciliationTransactions } from "./reconciliation-transactions";
import { ReconciliationSummary } from "./reconciliation-summary";

interface ReconciliationDetailViewProps {
  reconciliation: BankReconciliation;
  onBack: () => void;
  onRefresh: () => void;
}

export function ReconciliationDetailView({
  reconciliation,
  onBack,
  onRefresh
}: ReconciliationDetailViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenditureEntries, setExpenditureEntries] = useState<ExpenditureEntry[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ReconciliationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch reconciliation items and transactions
  const fetchData = async () => {
    setIsLoading(true);

    // Fetch reconciliation items
    let itemsData: ReconciliationItem[] = [];
    try {
      const response = await supabase
        .from("reconciliation_items")
        .select("*")
        .eq("reconciliation_id", reconciliation.id)
        .order("date", { ascending: false });

      if (response.error) {
        console.error("Error fetching reconciliation items:",
          response.error.message || "Unknown error");
      } else {
        itemsData = response.data || [];
      }
    } catch (err) {
      console.error("Exception in reconciliation items fetch:", err);
    }
    setReconciliationItems(itemsData);

    // Fetch income entries for the period
    let incomeData: IncomeEntry[] = [];
    try {
      const response = await supabase
        .from("income_entries")
        .select(`
          *,
          income_categories(id, name),
          accounts(id, name)
        `)
        .eq("account_id", reconciliation.account_id)
        .gte("date", reconciliation.start_date)
        .lte("date", reconciliation.end_date)
        .order("date", { ascending: false });

      if (response.error) {
        console.error("Error fetching income entries:",
          response.error.message || "Unknown error");
        toast.error("Could not load income entries. Some data may be missing.");
      } else {
        incomeData = response.data || [];
      }
    } catch (err) {
      console.error("Exception in income entries fetch:", err);
    }
    setIncomeEntries(incomeData);

    // Fetch expenditure entries for the period
    let expenditureData: ExpenditureEntry[] = [];
    try {
      const response = await supabase
        .from("expenditure_entries")
        .select(`
          *,
          expenditure_categories(id, name),
          accounts(id, name)
        `)
        .eq("account_id", reconciliation.account_id)
        .gte("date", reconciliation.start_date)
        .lte("date", reconciliation.end_date)
        .order("date", { ascending: false });

      if (response.error) {
        console.error("Error fetching expenditure entries:",
          response.error.message || "Unknown error");
        toast.error("Could not load expenditure entries. Some data may be missing.");
      } else {
        expenditureData = response.data || [];
      }
    } catch (err) {
      console.error("Exception in expenditure entries fetch:", err);
    }
    setExpenditureEntries(expenditureData);

    // Always set loading to false at the end
    setIsLoading(false);
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, [reconciliation.id]);

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
    // Parse the date string directly without timezone adjustments
    // This ensures the exact date is displayed as stored in the database
    try {
      // Split the date string and create a date object
      const [year, month, day] = dateString.split('-').map(Number);

      // Create a date object with the local timezone
      const date = new Date(year, month - 1, day);

      // Format the date using our standard format (dd-MMM-yy)
      return format(date, "dd-MMM-yy");
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return dateString; // Return the original string if parsing fails
    }
  };

  // Handle add item success
  const handleItemAdded = () => {
    fetchData();
    setShowAddItemDialog(false);
  };

  // Handle delete button click
  const handleDeleteClick = (item: ReconciliationItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    try {
      const response = await supabase
        .from("reconciliation_items")
        .delete()
        .eq("id", itemToDelete.id);

      if (response.error) {
        console.error("Error deleting reconciliation item:",
          response.error.message || "Unknown error");
        toast.error("Failed to delete reconciliation item. Please try again.");
      } else {
        toast.success("Reconciliation item deleted successfully");
        setShowDeleteDialog(false);
        fetchData();
      }
    } catch (err) {
      console.error("Exception in delete operation:", err);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle complete reconciliation
  const handleCompleteReconciliation = async () => {
    setIsCompleting(true);

    try {
      const response = await supabase
        .from("bank_reconciliations")
        .update({
          status: 'done',
          updated_at: new Date().toISOString(),
        })
        .eq("id", reconciliation.id);

      if (response.error) {
        console.error("Error completing reconciliation:",
          response.error.message || "Unknown error");
        toast.error("Failed to mark reconciliation as complete. Please try again.");
      } else {
        toast.success("Reconciliation marked as complete");
        setShowCompleteDialog(false);
        onRefresh(); // Refresh the parent component
      }
    } catch (err) {
      console.error("Exception in complete reconciliation operation:", err);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Calculate reconciliation summary
  const summary = {
    totalIncome: incomeEntries.reduce((sum, entry) => sum + entry.amount, 0),
    totalExpenditure: expenditureEntries.reduce((sum, entry) => sum + entry.amount, 0),
    clearedIncome: reconciliationItems
      .filter(item => item.transaction_type === "income" && item.is_cleared)
      .reduce((sum, item) => sum + item.amount, 0),
    clearedExpenditure: reconciliationItems
      .filter(item => item.transaction_type === "expenditure" && item.is_cleared)
      .reduce((sum, item) => sum + item.amount, 0),
    unclearedIncome: reconciliationItems
      .filter(item => item.transaction_type === "income" && !item.is_cleared)
      .reduce((sum, item) => sum + item.amount, 0),
    unclearedExpenditure: reconciliationItems
      .filter(item => item.transaction_type === "expenditure" && !item.is_cleared)
      .reduce((sum, item) => sum + item.amount, 0),
  };

  // Calculate difference
  const difference = reconciliation.bank_balance - reconciliation.book_balance;
  const adjustedBookBalance = reconciliation.book_balance +
    summary.unclearedIncome - summary.unclearedExpenditure;
  const finalDifference = reconciliation.bank_balance - adjustedBookBalance;

  return (
    <>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {reconciliation.accounts?.name || "Account"} Reconciliation
            </h2>
            <p className="text-muted-foreground">
              {formatDate(reconciliation.start_date)} - {formatDate(reconciliation.end_date)}
            </p>
          </div>
          <div className="ml-auto">
            {reconciliation.status === 'completed' ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Reconciled
              </Badge>
            ) : (
              <Button onClick={() => setShowCompleteDialog(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Reconciled
              </Button>
            )}
          </div>
        </div>

        {/* Reconciliation Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <ReconciliationSummary
              reconciliation={reconciliation}
              summary={summary}
              difference={difference}
              adjustedBookBalance={adjustedBookBalance}
              finalDifference={finalDifference}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Debug info */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800">Debug Information</CardTitle>
              </CardHeader>
              <CardContent className="text-yellow-800 text-sm">
                <div className="space-y-2">
                  <div><strong>Account ID:</strong> {reconciliation.account_id}</div>
                  <div><strong>Start Date:</strong> {reconciliation.start_date}</div>
                  <div><strong>End Date:</strong> {reconciliation.end_date}</div>
                  <div><strong>Income Entries:</strong> {incomeEntries.length}</div>
                  <div><strong>Expenditure Entries:</strong> {expenditureEntries.length}</div>
                  <div><strong>Reconciliation Items:</strong> {reconciliationItems.length}</div>
                </div>
              </CardContent>
            </Card>

            <ReconciliationTransactions
              incomeEntries={incomeEntries}
              expenditureEntries={expenditureEntries}
              reconciliationItems={reconciliationItems}
              onAddItem={() => setShowAddItemDialog(true)}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              reconciliationId={reconciliation.id}
            />
          </TabsContent>


        </Tabs>
      </div>

      {/* Add Reconciliation Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Reconciliation Item</DialogTitle>
            <DialogDescription>
              Add a new item to your reconciliation
            </DialogDescription>
          </DialogHeader>
          <ReconciliationItemForm
            reconciliationId={reconciliation.id}
            incomeEntries={incomeEntries}
            expenditureEntries={expenditureEntries}
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
              Are you sure you want to delete this reconciliation item? This action cannot be undone.
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

      {/* Complete Reconciliation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Complete Reconciliation</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this reconciliation as complete?
            </DialogDescription>
            {finalDifference !== 0 && (
              <div className="mt-2 text-destructive">
                Warning: There is still a difference of {formatCurrency(Math.abs(finalDifference))} between the bank and adjusted book balance.
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteReconciliation} disabled={isCompleting}>
              {isCompleting ? "Completing..." : "Complete Reconciliation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
