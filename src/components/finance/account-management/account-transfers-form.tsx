"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { transferFormSchema, useAccountTransferMutation, TransferFormValues } from "@/hooks/use-account-transfers";
import { formatCurrency } from "@/lib/format-currency";

export function AccountTransfersForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use our custom hook to fetch accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts({
    refreshInterval: 10000 // Refresh every 10 seconds
  });

  // Use our custom mutation hook
  const transferMutation = useAccountTransferMutation();

  // Initialize form
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      date: new Date(),
      source_account_id: "",
      destination_account_id: "",
      amount: "",
      description: "",
    },
  });

  // Handle form submission
  const onSubmit = (values: TransferFormValues) => {
    setIsSubmitting(true);
    transferMutation.mutate(values, {
      onSettled: () => {
        setIsSubmitting(false);
        // Reset form on success
        if (!transferMutation.isError) {
          form.reset({
            date: new Date(),
            source_account_id: "",
            destination_account_id: "",
            amount: "",
            description: "",
          });
        }
      }
    });
  };

  // Get account balance by ID
  const getAccountBalance = (accountId: string) => {
    const account = accounts?.find(a => a.id === accountId);
    return account?.calculatedBalance !== undefined ? account.calculatedBalance : (account?.balance || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Funds</CardTitle>
        <CardDescription>Move money between accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="dd-MMM-yy"
                    disabledDates={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingAccounts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.calculatedBalance !== undefined ? account.calculatedBalance : (account.balance || 0))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <FormDescription>
                      Available balance: {formatCurrency(getAccountBalance(field.value))}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Account</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingAccounts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.calculatedBalance !== undefined ? account.calculatedBalance : (account.balance || 0))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <FormDescription>
                      Current balance: {formatCurrency(getAccountBalance(field.value))}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter transfer description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Transfer Funds"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
