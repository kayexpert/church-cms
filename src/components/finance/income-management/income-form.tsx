"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { IncomeCategory, Account, IncomeEntry } from "@/types/finance";
import { useFinancialForm } from "@/hooks/use-financial-form";
import * as z from "zod";
import { preventWheelScroll } from "@/lib/prevent-wheel-scroll";
import { useIncomeCategories, useIncomeMutations } from "@/hooks/use-income-management";
import { useAccounts } from "@/hooks/use-accounts";
import { useActiveMembers } from "@/hooks/use-active-members";
import { formatCurrency } from "@/lib/format-currency";
import { filterSystemIncomeCategories } from "@/lib/identify-system-categories";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MobileOptimizedForm } from "@/components/ui/mobile-optimized-form";
import { FinanceFormContainer } from "@/components/finance/common/finance-form-container";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Form schema
const incomeFormSchema = z.object({
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Please select a valid date",
  }).refine(date => !!date, {
    message: "Date is required",
  }),
  category_id: z.string({
    required_error: "Category is required",
  }),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    {
      message: "Amount must be a positive number",
    }
  ),
  payment_method: z.string({
    required_error: "Payment method is required",
  }),
  account_id: z.string({
    required_error: "Account is required",
  }),
  member_id: z.string().optional(),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

interface IncomeFormProps {
  incomeCategories: IncomeCategory[];
  accounts: Account[];
  entry?: IncomeEntry | null;
  isEditing?: boolean;
  isDialog?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function IncomeForm({
  incomeCategories,
  accounts,
  entry,
  isEditing = false,
  isDialog = false,
  onSuccess,
  onCancel,
}: IncomeFormProps) {
  // State to track the selected account
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(
    entry?.account_id ? accounts.find(a => a.id === entry.account_id) || null : null
  );

  // State to track if member selection should be shown
  const [showMemberSelection, setShowMemberSelection] = useState<boolean>(false);

  // Fetch active members for the dropdown
  const { data: membersData, isLoading: isLoadingMembers } = useActiveMembers();
  const members = membersData?.data || [];

  // Using the imported formatCurrency function

  // Handle account selection change
  const handleAccountChange = (accountId: string) => {
    // Set the form value to the account ID
    form.setValue("account_id", accountId);

    if (accountId) {
      const account = accounts.find(a => a.id === accountId);
      setSelectedAccount(account || null);
    } else {
      setSelectedAccount(null);
    }
  };

  // Handle category selection change
  const handleCategoryChange = (categoryId: string) => {
    // Set the form value to the category ID
    form.setValue("category_id", categoryId);

    // Check if the selected category is Tithes or Welfare
    const category = incomeCategories.find(c => c.id === categoryId);
    const isTitheOrWelfare = category &&
      (category.name.toLowerCase() === 'tithes' ||
       category.name.toLowerCase() === 'tithe' ||
       category.name.toLowerCase() === 'welfare');

    setShowMemberSelection(!!isTitheOrWelfare);

    // If we're hiding the member selection, clear the member_id field
    if (!isTitheOrWelfare) {
      form.setValue("member_id", "");
    }
  };

  // Check if we should show member selection when component mounts or when entry changes
  useEffect(() => {
    if (entry?.category_id) {
      const category = incomeCategories.find(c => c.id === entry.category_id);
      const isTitheOrWelfare = category &&
        (category.name.toLowerCase() === 'tithes' ||
         category.name.toLowerCase() === 'tithe' ||
         category.name.toLowerCase() === 'welfare');

      setShowMemberSelection(!!isTitheOrWelfare);
    }
  }, [entry, incomeCategories]);

  // Use our custom financial form hook
  const { form, isSubmitting, handleSubmit } = useFinancialForm<IncomeFormValues>({
    formSchema: incomeFormSchema,
    defaultValues: {
      date: entry ? new Date(entry.date) : new Date(),
      category_id: entry?.category_id || "",
      description: entry?.description || "",
      amount: entry ? entry.amount.toString() : "",
      payment_method: entry?.payment_method || "cash",
      account_id: entry?.account_id || "",
      member_id: entry?.member_id || "",
    },
    tableName: "income_entries",
    successMessage: isEditing
      ? "Income entry updated successfully"
      : "Income entry added successfully",
    errorMessage: `Failed to ${isEditing ? "update" : "add"} income entry`,
    resetAfterSubmit: !isEditing,
    transformData: (values) => {
      // Get account details if an account is selected
      let paymentDetails = null;

      if (values.account_id) {
        const selectedAccount = accounts.find(a => a.id === values.account_id);
        if (selectedAccount) {
          paymentDetails = {
            account_id: selectedAccount.id,
            account_name: selectedAccount.name,
            account_type: selectedAccount.account_type
          };
        }
      }

      // Format date with timezone adjustment to prevent date shift
      // Clone the date and set time to noon to avoid timezone issues
      const dateObj = new Date(values.date);
      dateObj.setHours(12, 0, 0, 0);

      // Create the data object to be sent to the server
      const formattedData = {
        date: format(dateObj, "yyyy-MM-dd"),
        category_id: values.category_id,
        description: values.description || null,
        amount: parseFloat(values.amount),
        payment_method: values.payment_method,
        payment_details: paymentDetails,
        account_id: values.account_id || null,
        member_id: values.member_id || null
      };

      // Log the data for debugging
      console.log("Formatted data for submission:", formattedData);

      return formattedData;
    },
    onSuccess,
    entryId: entry?.id,
  });

  // Common form content
  const formContent = (
    <div className="flex flex-col space-y-4">
      {/* Date Field */}
      <FormField
        control={form.control as any}
        name="date"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="text-sm font-medium">Date</FormLabel>
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

      {/* Category Field - Full Width */}
      <FormField
        control={form.control as any}
        name="category_id"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="text-sm font-medium">Category</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                handleCategoryChange(value);
              }}
              defaultValue={field.value}
            >
              <FormControl className="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {filterSystemIncomeCategories(incomeCategories).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Member Field - Conditionally Rendered */}
      {showMemberSelection && (
        <FormField
          control={form.control as any}
          name="member_id"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-medium">Member</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl className="w-full">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingMembers ? (
                    <SelectItem value="loading" disabled>Loading members...</SelectItem>
                  ) : members.length > 0 ? (
                    members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-members" disabled>No active members found</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the member who made this payment
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Amount Field */}
      <FormField
        control={form.control as any}
        name="amount"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="text-sm font-medium">Amount</FormLabel>
            <FormControl >
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7 w-full"
                  onWheel={preventWheelScroll}
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Account Field */}
      <FormField
        control={form.control as any}
        name="account_id"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="text-sm font-medium">Account</FormLabel>
            <Select
              onValueChange={(value) => {
                handleAccountChange(value);
                // Set a default payment method when account changes
                form.setValue("payment_method", "cash");
              }}
              value={field.value}
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
              <div className="text-sm text-muted-foreground mt-1">
                Current balance: {formatCurrency(selectedAccount.calculatedBalance !== undefined ? selectedAccount.calculatedBalance : (selectedAccount.balance || 0))}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description Field */}
      <FormField
        control={form.control as any}
        name="description"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter description"
                className="resize-none min-h-[80px] w-full"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  if (isDialog) {
    return (
      <Dialog open={true} onOpenChange={onCancel}>
        <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Income Entry" : "Add Income Entry"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the details of this income entry" : "Add a new income entry"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              {formContent}
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" type="button" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={Boolean(isSubmitting)}
                >
                  {isSubmitting
                    ? isEditing
                      ? "Updating..."
                      : "Adding..."
                    : isEditing
                    ? "Update Income"
                    : "Add Income"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }



  return (
    <Form {...form}>
      <MobileOptimizedForm
        title="Add New Income"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Add Income"
        className="border shadow-sm"
      >
        <div className="flex flex-col space-y-4">
        {/* Date Field */}
        <FormField
          control={form.control as any}
          name="date"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-medium">Date</FormLabel>
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

        {/* Category Field - Full Width */}
        <FormField
          control={form.control as any}
          name="category_id"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-medium">Category</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleCategoryChange(value);
                }}
                value={field.value}
              >
                <FormControl className="w-full">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filterSystemIncomeCategories(incomeCategories).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Member Field - Conditionally Rendered */}
        {showMemberSelection && (
          <FormField
            control={form.control as any}
            name="member_id"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-sm font-medium">Member</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl className="w-full">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingMembers ? (
                      <SelectItem value="loading" disabled>Loading members...</SelectItem>
                    ) : members.length > 0 ? (
                      members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-members" disabled>No active members found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the member who made this payment
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Amount Field */}
        <FormField
          control={form.control as any}
          name="amount"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-medium">Amount</FormLabel>
              <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full"
                    onWheel={preventWheelScroll}
                    {...field}
                  />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Field */}
        <FormField
          control={form.control as any}
          name="account_id"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-medium">Account</FormLabel>
              <Select
                onValueChange={(value) => {
                  handleAccountChange(value);
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
                <div className="text-sm text-muted-foreground mt-1">
                  Current balance: {formatCurrency(selectedAccount.calculatedBalance !== undefined ? selectedAccount.calculatedBalance : (selectedAccount.balance || 0))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Field */}
        <FormField
          control={form.control as any}
          name="description"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter description"
                  className="resize-none min-h-[80px] w-full"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </MobileOptimizedForm>
    </Form>
  );
}
