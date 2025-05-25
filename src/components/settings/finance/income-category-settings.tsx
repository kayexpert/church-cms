"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, Edit2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { isSystemIncomeCategory } from "@/lib/identify-system-categories";

// Function to identify system categories
const isSystemCategory = (category: IncomeCategory): boolean => {
  // Check if it's a system category using the utility function
  return isSystemIncomeCategory(category) ||
    // Additional checks specific to this component
    category.name === "Opening Balance" ||
    (category.description?.toLowerCase().includes("system category") || false);
};

// Define the income category interface
interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Define the form schema
const incomeCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
});

type IncomeCategoryFormValues = z.infer<typeof incomeCategorySchema>;

export function IncomeCategorySettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<IncomeCategory[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [showSystemCategories, setShowSystemCategories] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<IncomeCategory | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<IncomeCategory | null>(null);

  // Initialize form
  const form = useForm<IncomeCategoryFormValues>({
    resolver: zodResolver(incomeCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Initialize edit form
  const editForm = useForm<IncomeCategoryFormValues>({
    resolver: zodResolver(incomeCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Load income categories
  const loadCategories = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("income_categories")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      // Store all categories
      setAllCategories(data || []);

      // Filter categories based on showSystemCategories state
      updateDisplayedCategories(data || [], showSystemCategories);
    } catch (error) {
      console.error("Error loading income categories:", error);
      toast.error("Failed to load income categories");
    } finally {
      setIsLoading(false);
    }
  };

  // Update displayed categories based on showSystemCategories state
  const updateDisplayedCategories = (data: IncomeCategory[], showSystem: boolean) => {
    if (showSystem) {
      setCategories(data);
    } else {
      const filteredCategories = data.filter(category => !isSystemCategory(category));
      setCategories(filteredCategories);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Update displayed categories when showSystemCategories changes
  useEffect(() => {
    updateDisplayedCategories(allCategories, showSystemCategories);
  }, [showSystemCategories, allCategories]);

  // Set edit form values when category to edit changes
  useEffect(() => {
    if (categoryToEdit) {
      editForm.reset({
        name: categoryToEdit.name,
        description: categoryToEdit.description || "",
      });
    }
  }, [categoryToEdit, editForm]);

  // Handle form submission
  const onSubmit = async (values: IncomeCategoryFormValues) => {
    try {
      setIsLoading(true);

      // Check if category with same name already exists
      const { data: existingCategory, error: checkError } = await supabase
        .from("income_categories")
        .select("id")
        .eq("name", values.name)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingCategory) {
        toast.error("An income category with this name already exists");
        return;
      }

      // Insert new category
      const { error } = await supabase
        .from("income_categories")
        .insert({
          name: values.name,
          description: values.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Reset form and reload categories
      form.reset({
        name: "",
        description: "",
      });

      await loadCategories();
      toast.success("Income category added successfully");
    } catch (error) {
      console.error("Error adding income category:", error);
      toast.error("Failed to add income category");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit form submission
  const onEditSubmit = async (values: IncomeCategoryFormValues) => {
    if (!categoryToEdit) return;

    try {
      setIsLoading(true);

      // Check if this is a system category
      if (isSystemCategory(categoryToEdit)) {
        toast.error("System categories cannot be edited");
        setShowEditDialog(false);
        setCategoryToEdit(null);
        return;
      }

      // Check if category with same name already exists (excluding the current category)
      const { data: existingCategory, error: checkError } = await supabase
        .from("income_categories")
        .select("id")
        .eq("name", values.name)
        .neq("id", categoryToEdit.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingCategory) {
        toast.error("An income category with this name already exists");
        return;
      }

      // Update category
      const { error } = await supabase
        .from("income_categories")
        .update({
          name: values.name,
          description: values.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryToEdit.id);

      if (error) {
        throw error;
      }

      await loadCategories();
      setShowEditDialog(false);
      setCategoryToEdit(null);
      toast.success("Income category updated successfully");
    } catch (error) {
      console.error("Error updating income category:", error);
      toast.error("Failed to update income category");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle category deletion
  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setIsLoading(true);

      // Check if this is a system category
      if (isSystemCategory(categoryToDelete)) {
        toast.error("System categories cannot be deleted");
        setShowDeleteDialog(false);
        setCategoryToDelete(null);
        return;
      }

      // Check if category is being used by any income entries
      const { data: incomeEntries, error: checkError } = await supabase
        .from("income_entries")
        .select("id")
        .eq("category_id", categoryToDelete.id);

      if (checkError) {
        throw checkError;
      }

      if (incomeEntries && incomeEntries.length > 0) {
        toast.error(`Cannot delete category. It is used by ${incomeEntries.length} income entries.`);
        setShowDeleteDialog(false);
        setCategoryToDelete(null);
        return;
      }

      // Delete category
      const { error } = await supabase
        .from("income_categories")
        .delete()
        .eq("id", categoryToDelete.id);

      if (error) {
        throw error;
      }

      await loadCategories();
      toast.success("Income category deleted successfully");
    } catch (error) {
      console.error("Error deleting income category:", error);
      toast.error("Failed to delete income category");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Add New Income Category</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter category description"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Category"}
            </Button>
          </form>
        </Form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Income Categories</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {showSystemCategories ? "Showing system categories" : "Hiding system categories"}
            </span>
            <div className="flex items-center space-x-2">
              <Switch
                checked={showSystemCategories}
                onCheckedChange={setShowSystemCategories}
                id="show-system-categories-income"
              />
              <label htmlFor="show-system-categories-income" className="text-sm cursor-pointer">
                {showSystemCategories ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </label>
            </div>
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="text-muted-foreground">No income categories added yet</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      {category.name}
                      {isSystemCategory(category) && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{category.description || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end space-x-2">
                        {isSystemCategory(category) ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="text-muted-foreground cursor-not-allowed"
                              title="System categories cannot be edited"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="text-muted-foreground cursor-not-allowed"
                              title="System categories cannot be deleted"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCategoryToEdit(category);
                                setShowEditDialog(true);
                              }}
                              className="text-primary hover:text-primary/90 hover:bg-primary/10"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCategoryToDelete(category);
                                setShowDeleteDialog(true);
                              }}
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Category Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          // Only allow closing through explicit button clicks
          if (!open) {
            setShowEditDialog(false);
          }
        }}
      >
        <DialogContent
          // Disable the close functionality when clicking outside
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          // Disable the close functionality when pressing escape key
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Income Category</DialogTitle>
            <DialogDescription>
              Update the category details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter category description"
                        className="min-h-[100px]"
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
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the income category "{categoryToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
