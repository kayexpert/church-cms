"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import { useAccounts } from "@/hooks/use-accounts";
import { editTransferFormSchema, useEditAccountTransferMutation, EditTransferFormValues } from "@/hooks/use-account-transfers";

interface EditTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: any; // The transfer to edit
  onSuccess?: () => void;
}

export function EditTransferDialog({
  open,
  onOpenChange,
  transfer,
  onSuccess,
}: EditTransferDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use our custom hook to fetch accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();

  // Use our custom mutation hook
  const editTransferMutation = useEditAccountTransferMutation();

  // Initialize form
  const form = useForm<EditTransferFormValues>({
    resolver: zodResolver(editTransferFormSchema),
    defaultValues: {
      id: transfer?.id || "",
      date: transfer?.date ? parse(transfer.date, "yyyy-MM-dd", new Date()) : new Date(),
      source_account_id: transfer?.source_account_id || "",
      destination_account_id: transfer?.destination_account_id || "",
      amount: transfer?.amount ? String(transfer.amount) : "",
      description: transfer?.description || "",
    },
  });

  // Update form values when transfer changes
  useEffect(() => {
    if (transfer) {
      form.reset({
        id: transfer.id,
        date: transfer.date ? parse(transfer.date, "yyyy-MM-dd", new Date()) : new Date(),
        source_account_id: transfer.source_account_id,
        destination_account_id: transfer.destination_account_id,
        amount: String(transfer.amount),
        description: transfer.description || "",
      });
    }
  }, [transfer, form]);

  // Handle form submission
  const onSubmit = (values: EditTransferFormValues) => {
    setIsSubmitting(true);
    editTransferMutation.mutate(values, {
      onSuccess: () => {
        setIsSubmitting(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      },
      onError: () => {
        setIsSubmitting(false);
      }
    });
  };

  // Get account balance by ID
  const getAccountBalance = (accountId: string) => {
    const account = accounts?.find(a => a.id === accountId);
    return account?.calculatedBalance !== undefined ? account.calculatedBalance : (account?.balance || 0);
  };

  // Get account name by ID
  const getAccountName = (accountId: string) => {
    return accounts?.find(a => a.id === accountId)?.name || "Unknown Account";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Transfer</DialogTitle>
          <DialogDescription>
            Update the details of the transfer between accounts.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date Field */}
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

            {/* Source Account Field */}
            <FormField
              control={form.control}
              name="source_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                  <Select
                    disabled={isLoadingAccounts}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(getAccountBalance(account.id))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destination Account Field */}
            <FormField
              control={form.control}
              name="destination_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Account</FormLabel>
                  <Select
                    disabled={isLoadingAccounts}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(getAccountBalance(account.id))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount Field */}
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
                      placeholder="Enter amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description"
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Transfer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
