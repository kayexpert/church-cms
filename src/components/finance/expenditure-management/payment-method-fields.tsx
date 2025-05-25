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
}

export function AccountField({
  form,
  accounts,
  onAccountChange,
  showBalanceWarning = false
}: AccountFieldProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

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

  // Initialize selected account from form value
  useEffect(() => {
    const accountId = form.getValues("account_id");
    if (accountId) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        setSelectedAccount(account);
      }
    }
  }, [form, accounts]);

  return (
    <div>
      {/* Account Field */}
      <FormField
        control={form.control}
        name="account_id"
        render={({ field }) => (
          <FormItem>
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
                      {account.name} ({formatCurrency(account.balance || 0)})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-accounts" disabled>No accounts available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <div className={`text-sm mt-1 ${showBalanceWarning ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                Current balance: {formatCurrency(selectedAccount.balance || 0)}
                {showBalanceWarning && (
                  <div className="text-red-500 font-medium">
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
