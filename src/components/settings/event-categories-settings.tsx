"use client";

import { useState } from "react";
import { Trash2, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { useEventCategories } from "@/hooks/useEvents";
import { EventCategory } from "@/services/event-service";
import { addEventCategory, deleteEventCategory, updateEventCategory } from "@/services/event-service";
import { supabase } from "@/lib/supabase";

export function EventCategoriesSettings() {
  const { data: categories = [], refetch } = useEventCategories();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<EventCategory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<EventCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#4CAF50");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await addEventCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("already exists")) {
          toast.error(`A category with this name already exists`);
        } else {
          toast.error(`Failed to add event category: ${error.message}`);
        }
        return;
      }

      toast.success("Event category added successfully");
      setNewCategoryName("");
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error adding event category:", errorMessage);
      toast.error(`Failed to add event category: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const { error } = await deleteEventCategory(categoryToDelete.id);

      if (error) {
        toast.error(`Failed to delete event category: ${error.message}`);
        return;
      }

      toast.success("Event category deleted successfully");
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error deleting event category:", errorMessage);
      toast.error(`Failed to delete event category: ${errorMessage}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryToEdit) return;

    if (!editCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if name is changed and if a category with the new name already exists
      if (editCategoryName.trim() !== categoryToEdit.name) {
        const { data: existingCategory, error: checkError } = await supabase
          .from("event_categories")
          .select("id")
          .eq("name", editCategoryName.trim())
          .neq("id", categoryToEdit.id)
          .maybeSingle();

        if (checkError) {
          toast.error(`Error checking category name: ${checkError.message}`);
          return;
        }

        if (existingCategory) {
          toast.error(`A category with this name already exists`);
          return;
        }
      }

      const { data, error } = await updateEventCategory(categoryToEdit.id, {
        name: editCategoryName.trim(),
        color: editCategoryColor
      });

      if (error) {
        toast.error(`Failed to update event category: ${error.message}`);
        return;
      }

      toast.success("Event category updated successfully");
      setIsEditDialogOpen(false);
      setCategoryToEdit(null);
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error updating event category:", errorMessage);
      toast.error(`Failed to update event category: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (category: EventCategory) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const openEditDialog = (category: EventCategory) => {
    setCategoryToEdit(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color || "#4CAF50");
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Add New Event Category</h2>
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryColor">Category Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="categoryColor"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? "Adding..." : "Add Category"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Event Categories</h2>

        {categories.length === 0 ? (
          <p className="text-muted-foreground">No categories added yet</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Color</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: category.color || "#4CAF50" }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">{category.name}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                          className="text-primary hover:text-primary/90 hover:bg-primary/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(category)}
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
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          // Only allow closing through explicit button clicks
          if (!open) {
            setIsEditDialogOpen(false);
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
            <DialogTitle>Edit Event Category</DialogTitle>
            <DialogDescription>
              Update the category details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCategoryName">Category Name</Label>
              <Input
                id="editCategoryName"
                placeholder="Enter category name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCategoryColor">Category Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="editCategoryColor"
                  type="color"
                  value={editCategoryColor}
                  onChange={(e) => setEditCategoryColor(e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={editCategoryColor}
                  onChange={(e) => setEditCategoryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
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
