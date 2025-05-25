"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { formatCurrency } from "@/lib/format-currency";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LiabilityEntry, Account } from "@/types/finance";
import { useLiabilityMutations } from "@/hooks/use-liability-mutations";

// Form schema
const paymentFormSchema = z.object({
  date: z.date({
    required_error: "Payment date is required",
  }),
  amount: z.string().min(1, "Payment amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    {
      message: "Payment amount must be a positive number",
    }
  ),
  payment_method: z.string({
    required_error: "Payment method is required",
  }),
  account_id: z.string({
    required_error: "Account is required",
  }),
  description: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface LiabilityPaymentDialogProps {
  liability: LiabilityEntry;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LiabilityPaymentDialog({
  liability,
  accounts,
  isOpen,
  onClose,
  onSuccess,
}: LiabilityPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { makePaymentMutation } = useLiabilityMutations();

  // Get the remaining amount
  const remainingAmount = typeof liability.amount_remaining === 'string'
    ? parseFloat(liability.amount_remaining)
    : liability.amount_remaining || 0;

  // Initialize form with default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      date: new Date(),
      amount: remainingAmount.toString(),
      payment_method: "cash",
      description: `Payment for ${liability.creditor_name}`,
    },
  });

  // Handle form submission
  const onSubmit = async (values: PaymentFormValues) => {
    try {
      setIsSubmitting(true);

      // Convert amount to number
      const paymentAmount = parseFloat(values.amount);

      // Validate payment amount
      if (paymentAmount > remainingAmount) {
        form.setError("amount", {
          type: "manual",
          message: `Payment amount cannot exceed the remaining amount (${remainingAmount})`,
        });
        setIsSubmitting(false);
        return;
      }

      // Format date to ISO string (YYYY-MM-DD)
      const paymentDate = format(values.date, "yyyy-MM-dd");

      // Make payment
      await makePaymentMutation.mutateAsync({
        liability,
        paymentAmount,
        paymentDate,
        paymentMethod: values.payment_method,
        accountId: values.account_id,
        description: values.description,
      });

      // Close dialog and notify parent
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error making payment:", error);
      toast.error("Failed to make payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    // Reset form and close dialog
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {liability.creditor_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount (₵)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remainingAmount}
                      placeholder="Enter payment amount"
                      onWheel={preventWheelScroll}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Remaining amount: ₵{remainingAmount.toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />



            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Account</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Set a default payment method when account changes
                      form.setValue("payment_method", "cash");
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.calculatedBalance !== undefined ? account.calculatedBalance : (account.balance || 0))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && accounts.find(a => a.id === field.value) && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Current balance: {formatCurrency(
                        (() => {
                          const account = accounts.find(a => a.id === field.value);
                          return account ? (account.calculatedBalance !== undefined ? account.calculatedBalance : (account.balance || 0)) : 0;
                        })()
                      )}
                    </div>
                  )}
                  <FormDescription>
                    Select the account used for this payment
                  </FormDescription>
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
                    <Input
                      placeholder="Enter payment description"
                      {...field}
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
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Make Payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
