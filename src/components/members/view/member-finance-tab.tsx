"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import { Search, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberFinance, useMemberFinanceMutations } from "@/hooks/use-member-finance";
import { IncomeEntry } from "@/types/finance";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";

export interface MemberFinanceTabProps {
  memberId: string;
}

export function MemberFinanceTab({ memberId }: MemberFinanceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  
  // Fetch member finance data
  const { data: memberFinanceData, isLoading } = useMemberFinance(memberId);
  const { deleteMemberIncomeEntry } = useMemberFinanceMutations();
  
  // Filter finance entries based on search query
  const filteredEntries = memberFinanceData?.data.filter(entry => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const categoryName = entry.income_categories?.name?.toLowerCase() || '';
    const description = entry.description?.toLowerCase() || '';
    const date = formatDate(entry.date).toLowerCase();
    const amount = entry.amount.toString();
    
    return (
      categoryName.includes(searchLower) ||
      description.includes(searchLower) ||
      date.includes(searchLower) ||
      amount.includes(searchLower)
    );
  }) || [];
  
  // Calculate total amount
  const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (entryToDelete) {
      await deleteMemberIncomeEntry.mutateAsync(entryToDelete);
      setEntryToDelete(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-semibold">Financial Contributions</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[250px]"
          />
        </div>
      </div>
      
      {filteredEntries.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-sm">{entry.income_categories?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm">{entry.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(entry.amount)}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setEntryToDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-right">Total</td>
                  <td className="px-4 py-3 text-sm font-medium text-right">{formatCurrency(totalAmount)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
          title="No financial records found"
          description={
            searchQuery
              ? "Try adjusting your search query"
              : "This member has no financial contributions recorded yet"
          }
        />
      )}
      
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Financial Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this financial record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
