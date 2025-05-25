"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, Edit2 } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

// Define the liability category interface
interface LiabilityCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Define the form schema
const liabilityCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
});

type LiabilityCategoryFormValues = z.infer<typeof liabilityCategorySchema>;

export function LiabilityCategorySettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<LiabilityCategory[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<LiabilityCategory | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<LiabilityCategory | null>(null);

  // Initialize form
  const form = useForm<LiabilityCategoryFormValues>({
    resolver: zodResolver(liabilityCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Initialize edit form
  const editForm = useForm<LiabilityCategoryFormValues>({
    resolver: zodResolver(liabilityCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Load liability categories
  const loadCategories = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("liability_categories")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error loading liability categories:", error);
      toast.error("Failed to load liability categories");
    } finally {
      setIsLoading(false);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

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
  const onSubmit = async (values: LiabilityCategoryFormValues) => {
    try {
      setIsLoading(true);

      // Check if category with same name already exists
      const { data: existingCategory, error: checkError } = await supabase
        .from("liability_categories")
        .select("id")
        .eq("name", values.name)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingCategory) {
        toast.error("A liability category with this name already exists");
        return;
      }

      // Insert new category
      const { error } = await supabase
        .from("liability_categories")
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
      toast.success("Liability category added successfully");
    } catch (error) {
      console.error("Error adding liability category:", error);
      toast.error("Failed to add liability category");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit form submission
  const onEditSubmit = async (values: LiabilityCategoryFormValues) => {
    if (!categoryToEdit) return;

    try {
      setIsLoading(true);

      // Check if category with same name already exists (excluding the current category)
      const { data: existingCategory, error: checkError } = await supabase
        .from("liability_categories")
        .select("id")
        .eq("name", values.name)
        .neq("id", categoryToEdit.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingCategory) {
        toast.error("A liability category with this name already exists");
        return;
      }

      // Update category
      const { error } = await supabase
        .from("liability_categories")
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
      toast.success("Liability category updated successfully");
    } catch (error) {
      console.error("Error updating liability category:", error);
      toast.error("Failed to update liability category");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle category deletion
  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setIsLoading(true);

      // Check if category is being used by any liabilities
      const { data: liabilities, error: checkError } = await supabase
        .from("liabilities")
        .select("id")
        .eq("category_id", categoryToDelete.id);

      if (checkError) {
        throw checkError;
      }

      if (liabilities && liabilities.length > 0) {
        toast.error(`Cannot delete category. It is used by ${liabilities.length} liability entries.`);
        setShowDeleteDialog(false);
        setCategoryToDelete(null);
        return;
      }

      // Delete category
      const { error } = await supabase
        .from("liability_categories")
        .delete()
        .eq("id", categoryToDelete.id);

      if (error) {
        throw error;
      }

      await loadCategories();
      toast.success("Liability category deleted successfully");
    } catch (error) {
      console.error("Error deleting liability category:", error);
      toast.error("Failed to delete liability category");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Add New Liability Category</h2>
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
        <h2 className="text-xl font-semibold mb-4">Liability Categories</h2>

        {categories.length === 0 ? (
          <p className="text-muted-foreground">No liability categories added yet</p>
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
                    <td className="px-4 py-3 text-sm">{category.name}</td>
                    <td className="px-4 py-3 text-sm">{category.description || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end space-x-2">
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
            <DialogTitle>Edit Liability Category</DialogTitle>
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
            <AlertDialogTitle>Delete Liability Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the liability category "{categoryToDelete?.name}"? This action cannot be undone.
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
