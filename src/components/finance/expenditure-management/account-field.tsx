"use client";

import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Account } from "@/types/finance";
import { ExpenditureFormValues } from "./enhanced-expenditure-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface AccountFieldProps {
  form: UseFormReturn<ExpenditureFormValues, any>;
  accounts: Account[];
  onAccountChange?: (account: Account | null) => void;
  showBalanceWarning?: boolean;
  amount?: string; // Add amount prop to check against balance
}

export function AccountField({
  form,
  accounts,
  onAccountChange,
  showBalanceWarning = false,
  amount = ''
}: AccountFieldProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isBalanceExceeded, setIsBalanceExceeded] = useState(false);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵');
  };

  // Handle account selection change
  const handleAccountChange = (accountId: string) => {
    form.setValue("account_id", accountId);

    // Set a default payment method when account changes
    form.setValue("payment_method", "cash");

    if (accountId) {
      const account = accounts.find(a => a.id === accountId);
      setSelectedAccount(account || null);
      if (onAccountChange && account) {
        onAccountChange(account);
      }
    } else {
      setSelectedAccount(null);
      if (onAccountChange) {
        onAccountChange(null);
      }
    }
  };

  // Initialize and update selected account from form value
  useEffect(() => {
    const accountId = form.getValues("account_id");
    if (accountId) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        setSelectedAccount(account);
      }
    } else {
      // Reset selectedAccount when form value is empty
      setSelectedAccount(null);
    }
  }, [form, accounts, form.watch("account_id")]);

  // Check if amount exceeds balance
  useEffect(() => {
    if (selectedAccount && amount) {
      const expenditureAmount = parseFloat(amount);
      if (!isNaN(expenditureAmount)) {
        // Use balance or calculatedBalance, whichever is available
        const accountBalance = selectedAccount.balance !== undefined ? selectedAccount.balance :
                              (selectedAccount.calculatedBalance !== undefined ? selectedAccount.calculatedBalance : 0);

        setIsBalanceExceeded(expenditureAmount > accountBalance);
      } else {
        setIsBalanceExceeded(false);
      }
    } else {
      setIsBalanceExceeded(false);
    }
  }, [selectedAccount, amount]);

  return (
    <div className="w-full">
      {/* Account Field */}
      <FormField
        control={form.control}
        name="account_id"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="text-sm font-medium">Account</FormLabel>
            <Select
              onValueChange={handleAccountChange}
              value={field.value || ""}
            >
              <FormControl className="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.length > 0 ? (
                  accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.calculatedBalance !== undefined ? account.calculatedBalance : (account.balance || 0))})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-accounts" disabled>No accounts available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <div className={`text-sm mt-1 ${isBalanceExceeded ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                Current balance: {formatCurrency(selectedAccount.calculatedBalance !== undefined ? selectedAccount.calculatedBalance : (selectedAccount.balance || 0))}
                {isBalanceExceeded && (
                  <div className="text-red-500 font-medium mt-1">
                    Warning: Amount exceeds available balance
                  </div>
                )}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
