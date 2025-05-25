"use client";

import { useEffect, forwardRef, useImperativeHandle } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Account } from "@/types/finance";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Define the form schema
const accountFormSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  account_type: z.enum(["cash", "bank", "mobile_money", "other"], {
    required_error: "Account type is required",
  }),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  opening_balance: z.coerce.number().min(0, "Opening balance must be a positive number"),
  description: z.string().optional(),
  is_default: z.boolean().default(false),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

// Define the ref interface for external form control
export interface AccountFormRef {
  reset: () => void;
  getForm: () => UseFormReturn<AccountFormValues>;
}

interface AccountFormProps {
  account?: Account;
  onSubmit: (values: AccountFormValues) => void;
  isSubmitting: boolean;
  mode: "create" | "edit";
}

export const AccountForm = forwardRef<AccountFormRef, AccountFormProps>(
  function AccountForm({ account, onSubmit, isSubmitting, mode }, ref) {
  // Initialize form with default values or account values if editing
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name || "",
      account_type: (account?.account_type as any) || "bank",
      bank_name: account?.bank_name || "",
      account_number: account?.account_number || "",
      opening_balance: account?.opening_balance || 0,
      description: account?.description || "",
      is_default: account?.is_default || false,
    },
  });

  // Watch account type to conditionally show fields
  const accountType = form.watch("account_type");

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    reset: () => {
      form.reset({
        name: "",
        account_type: "bank",
        bank_name: "",
        account_number: "",
        opening_balance: 0,
        description: "",
        is_default: false,
      });
    },
    getForm: () => form
  }));

  // Update form values when account changes
  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        account_type: (account.account_type as any),
        bank_name: account.bank_name || "",
        account_number: account.account_number || "",
        opening_balance: account.opening_balance || 0,
        description: account.description || "",
        is_default: account.is_default,
      });
    }
  }, [account, form]);

  // Handle form submission
  const handleSubmit = (values: AccountFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter account name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl className="w-full">
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {accountType !== "cash" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {accountType === "bank"
                      ? "Bank Name"
                      : accountType === "mobile_money"
                      ? "Provider Name"
                      : "Institution Name"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        accountType === "bank"
                          ? "Enter bank name"
                          : accountType === "mobile_money"
                          ? "Enter provider name"
                          : "Enter institution name"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {accountType === "bank"
                      ? "Account Number"
                      : accountType === "mobile_money"
                      ? "Phone Number"
                      : "Reference Number"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        accountType === "bank"
                          ? "Enter account number"
                          : accountType === "mobile_money"
                          ? "Enter phone number"
                          : "Enter reference number"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="opening_balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Balance</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter opening balance"
                    {...field}
                  />
                </FormControl>
                {mode === "edit" && (
                  <FormDescription>
                    Changing the opening balance will adjust the account balance accordingly.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Default Account</FormLabel>
                  <FormDescription>
                    Set as the default account for new transactions
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter account description"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Updating..."}
            </>
          ) : (
            <>{mode === "create" ? "Create Account" : "Update Account"}</>
          )}
        </Button>
      </form>
    </Form>
  );
});
