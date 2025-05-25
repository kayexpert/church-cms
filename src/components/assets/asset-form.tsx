"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Asset, AssetType, AssetFormValues } from "@/types/assets";
import { useAssetTypes, useAssetMutations } from "@/hooks/use-assets";
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
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Form schema
const assetFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type_id: z.string().min(1, "Asset type is required"),
  acquisition_date: z.date({
    required_error: "Acquisition date is required",
  }),
  acquisition_value: z.string().min(1, "Acquisition value is required"),
  description: z.string().optional(),
  status: z.enum(["active", "in_repair", "disposed"], {
    required_error: "Status is required",
  }),
});

interface AssetFormProps {
  asset?: Asset;
  onSuccess?: () => void;
  isDialog?: boolean;
  onCancel?: () => void;
}

export function AssetForm({ asset, onSuccess, isDialog = false, onCancel }: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!asset;

  // Get asset types
  const { data: assetTypes, isLoading: isLoadingAssetTypes } = useAssetTypes();

  // Get asset mutations
  const { createAsset, updateAsset } = useAssetMutations();

  // Initialize form
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: asset?.name || "",
      type_id: asset?.type_id || "",
      acquisition_date: asset ? new Date(asset.acquisition_date) : new Date(),
      acquisition_value: asset ? asset.acquisition_value.toString() : "",
      description: asset?.description || "",
      status: asset?.status || "active",
    },
  });

  // Handle form submission
  const onSubmit = async (values: AssetFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && asset) {
        await updateAsset.mutateAsync({
          id: asset.id,
          ...values,
        });
      } else {
        await createAsset.mutateAsync(values);
      }

      // Reset form if not editing
      if (!isEditing) {
        form.reset({
          name: "",
          type_id: "",
          acquisition_date: new Date(),
          acquisition_value: "",
          description: "",
          status: "active",
        });
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting asset form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form content to be used in both dialog and regular form
  const formContent = (
    <div className="space-y-4">
      {/* Asset Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Asset Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter asset name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Asset Type */}
      <FormField
        control={form.control}
        name="type_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Asset Type</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isLoadingAssetTypes}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {assetTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Acquisition Date */}
      <FormField
        control={form.control}
        name="acquisition_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Acquisition Date</FormLabel>
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              placeholder="Select acquisition date"
              disabledDates={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Acquisition Value */}
      <FormField
        control={form.control}
        name="acquisition_value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Acquisition Value</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                onWheel={preventWheelScroll}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter asset description"
                className="resize-none"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Status */}
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_repair">In Repair</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
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
            <DialogTitle>{isEditing ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the details of this asset" : "Add a new asset to the system"}
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
                  {isSubmitting
                    ? isEditing
                      ? "Updating..."
                      : "Adding..."
                    : isEditing
                    ? "Update Asset"
                    : "Add Asset"}
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
        <CardTitle>{isEditing ? "Edit Asset" : "Add New Asset"}</CardTitle>
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
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Adding..."
                : isEditing
                ? "Update Asset"
                : "Add Asset"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
