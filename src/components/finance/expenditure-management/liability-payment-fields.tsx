"use client";

import { UseFormReturn } from "react-hook-form";
import { LiabilityEntry } from "@/types/finance";
import { ExpenditureFormValues } from "./enhanced-expenditure-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

interface LiabilityPaymentFieldsProps {
  form: UseFormReturn<ExpenditureFormValues, any>;
  liabilityEntries: LiabilityEntry[];
  isLiabilityPayment: boolean;
  handleLiabilityChange: (liabilityId: string) => void;
}

export function LiabilityPaymentFields({
  form,
  liabilityEntries,
  isLiabilityPayment,
  handleLiabilityChange
}: LiabilityPaymentFieldsProps) {
  // Filter out fully paid liabilities
  const unpaidLiabilities = liabilityEntries.filter(
    (liability) => liability.status !== "paid"
  );

  return (
    <>
      {/* Liability Payment Checkbox */}
      <FormField
        control={form.control}
        name="liability_payment"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Liability Payment</FormLabel>
              <FormDescription>
                Check this if this expenditure is a payment for an existing liability
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {/* Liability Selection (only shown if liability payment is checked) */}
      {isLiabilityPayment && (
        <FormField
          control={form.control}
          name="liability_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Select Liability</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleLiabilityChange(value);
                }}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a liability" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unpaidLiabilities.length > 0 ? (
                    unpaidLiabilities.map((liability) => (
                      <SelectItem key={liability.id} value={liability.id}>
                        {liability.creditor_name} - {liability.category?.name || "Unknown"} (₵{(liability.amount_remaining).toFixed(2)} remaining)
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-liabilities" disabled>
                      No unpaid liabilities found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
