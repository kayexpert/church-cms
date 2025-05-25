"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Asset, AssetDisposalFormValues } from "@/types/assets";
import { Account } from "@/types/finance";
import { useAssetDisposalMutations } from "@/hooks/use-asset-disposals";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { cn } from "@/lib/utils";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Form schema
const assetDisposalFormSchema = z.object({
  asset_id: z.string().min(1, "Asset is required"),
  disposal_date: z.date({
    required_error: "Disposal date is required",
  }),
  disposal_amount: z.string().min(1, "Disposal amount is required"),
  account_id: z.string().min(1, "Account is required"),
});

interface AssetDisposalFormProps {
  assets: Asset[];
  accounts: Account[];
  onSuccess?: () => void;
  isDialog?: boolean;
  onCancel?: () => void;
  preselectedAsset?: Asset;
}

export function AssetDisposalForm({
  assets,
  accounts,
  onSuccess,
  isDialog = false,
  onCancel,
  preselectedAsset,
}: AssetDisposalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get asset disposal mutations
  const { disposeAsset } = useAssetDisposalMutations();

  // Filter out already disposed assets
  const activeAssets = assets.filter(asset => asset.status !== "disposed");

  // Initialize form
  const form = useForm<AssetDisposalFormValues>({
    resolver: zodResolver(assetDisposalFormSchema),
    defaultValues: {
      asset_id: preselectedAsset?.id || "",
      disposal_date: new Date(),
      disposal_amount: "",
      account_id: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: AssetDisposalFormValues) => {
    setIsSubmitting(true);
    try {
      // First, try to fix the dispose_asset function
      try {
        await fetch('/api/db/fix-dispose-asset-function');
      } catch (fixError) {
        console.debug("Could not fix dispose_asset function:", fixError);
        // Continue anyway, the function might already be fixed
      }

      try {
        // Try to dispose the asset using the RPC function
        await disposeAsset.mutateAsync(values);
      } catch (disposeError) {
        console.error("Error using RPC to dispose asset:", disposeError);

        // If RPC fails, try the manual API endpoint as a last resort
        try {
          const response = await fetch('/api/db/manual-dispose-asset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assetId: values.asset_id,
              disposalDate: format(values.disposal_date, "yyyy-MM-dd"),
              disposalAmount: values.disposal_amount,
              accountId: values.account_id
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Manual disposal failed: ${errorData.error || response.statusText}`);
          }

          // If we get here, the manual disposal succeeded
          // Invalidate queries to refresh the UI
          disposeAsset.onSuccess?.();
        } catch (manualError) {
          console.error("Manual disposal also failed:", manualError);
          throw manualError;
        }
      }

      // Reset form
      form.reset({
        asset_id: "",
        disposal_date: new Date(),
        disposal_amount: "",
        account_id: "",
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting asset disposal form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form content to be used in both dialog and regular form
  const formContent = (
    <div className="space-y-4">
      {/* Asset Selection */}
      <FormField
        control={form.control}
        name="asset_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Asset</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={!!preselectedAsset}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {activeAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Only active assets can be disposed
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Disposal Date */}
      <FormField
        control={form.control}
        name="disposal_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Disposal Date</FormLabel>
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              placeholder="Select disposal date"
              disabledDates={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
            />
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
            <FormLabel>Disposal Amount</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                onWheel={preventWheelScroll}
                {...field}
              />
            </FormControl>
            <FormDescription>
              The amount received from disposing the asset
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Account Selection */}
      <FormField
        control={form.control}
        name="account_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Account</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
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
            <FormDescription>
              The account where the disposal amount will be added
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Render as dialog if isDialog is true
  if (isDialog) {
    return (
      <Dialog open={true} onOpenChange={onCancel}>
        <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Dispose Asset</DialogTitle>
            <DialogDescription>
              Record the disposal of an asset and add the amount to an account
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
                  {isSubmitting ? "Processing..." : "Dispose Asset"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Render as card
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispose Asset</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            {formContent}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Dispose Asset"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
