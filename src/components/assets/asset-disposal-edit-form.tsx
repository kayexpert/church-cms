"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { ExtendedAssetDisposal, AssetDisposalFormValues } from "@/types/assets";
import { Account } from "@/types/finance";
import { useAssetDisposalMutations } from "@/hooks/use-asset-disposals";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Form schema
const assetDisposalFormSchema = z.object({
  disposal_date: z.date({
    required_error: "Disposal date is required",
  }),
  disposal_amount: z.string().min(1, "Disposal amount is required"),
  account_id: z.string().min(1, "Account is required"),
});

interface AssetDisposalEditFormProps {
  disposal: ExtendedAssetDisposal;
  accounts: Account[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AssetDisposalEditForm({
  disposal,
  accounts,
  onSuccess,
  onCancel,
}: AssetDisposalEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get asset disposal mutations
  const { updateAssetDisposal } = useAssetDisposalMutations();

  // Initialize form with disposal data
  const form = useForm<AssetDisposalFormValues>({
    resolver: zodResolver(assetDisposalFormSchema),
    defaultValues: {
      asset_id: disposal.asset_id,
      disposal_date: disposal.disposal_date ? new Date(disposal.disposal_date) : new Date(),
      disposal_amount: disposal.disposal_amount?.toString() || "",
      account_id: disposal.account_id || "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: AssetDisposalFormValues) => {
    setIsSubmitting(true);

    // Create a unique ID for the toast
    const toastId = `update-disposal-${disposal.id}`;

    try {
      // Show loading toast
      toast.loading("Updating asset disposal...", { id: toastId });

      await updateAssetDisposal.mutateAsync({
        id: disposal.id,
        disposal_date: values.disposal_date,
        disposal_amount: values.disposal_amount,
        account_id: values.account_id,
        income_entry_id: disposal.income_entry_id || "",
      });

      // Dismiss loading toast
      toast.dismiss(toastId);

      // Show success toast
      toast.success("Asset disposal updated successfully", { id: toastId });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(toastId);

      console.error("Error updating asset disposal:", error);
      toast.error(`Failed to update asset disposal: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form content
  const formContent = (
    <div className="space-y-4">
      {/* Disposal Date */}
      <FormField
        control={form.control}
        name="disposal_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Disposal Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "dd-MMM-yy")
                    ) : (
                      <span>Select date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Disposal Amount */}
      <FormField
        control={form.control}
        name="disposal_amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Disposal Amount (₵)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                {...field}
                onWheel={preventWheelScroll}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Account */}
      <FormField
        control={form.control}
        name="account_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Asset Disposal</DialogTitle>
          <DialogDescription>
            Update the disposal details for {disposal.assets?.name}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {formContent}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Update Disposal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
