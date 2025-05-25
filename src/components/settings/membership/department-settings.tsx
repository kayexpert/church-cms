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
import { Department } from "@/types/member";

// Define the form schema
const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  description: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export function DepartmentSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);

  // Initialize form
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Initialize edit form
  const editForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Load departments
  const loadDepartments = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setDepartments(data || []);
    } catch (error) {
      console.error("Error loading departments:", error);
      toast.error("Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  };

  // Load departments on component mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Set edit form values when department to edit changes
  useEffect(() => {
    if (departmentToEdit) {
      editForm.reset({
        name: departmentToEdit.name,
        description: departmentToEdit.description || "",
      });
    }
  }, [departmentToEdit, editForm]);

  // Handle form submission
  const onSubmit = async (values: DepartmentFormValues) => {
    try {
      setIsLoading(true);

      // Check if department with same name already exists
      const { data: existingDept, error: checkError } = await supabase
        .from("departments")
        .select("id")
        .eq("name", values.name)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingDept) {
        toast.error("A department with this name already exists");
        return;
      }

      // Insert new department
      const { error } = await supabase
        .from("departments")
        .insert({
          name: values.name,
          description: values.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Reset form and reload departments
      form.reset({
        name: "",
        description: "",
      });

      await loadDepartments();
      toast.success("Department added successfully");
    } catch (error) {
      console.error("Error adding department:", error);
      toast.error("Failed to add department");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit form submission
  const onEditSubmit = async (values: DepartmentFormValues) => {
    if (!departmentToEdit) return;

    try {
      setIsLoading(true);

      // Check if department with same name already exists (excluding the current department)
      const { data: existingDept, error: checkError } = await supabase
        .from("departments")
        .select("id")
        .eq("name", values.name)
        .neq("id", departmentToEdit.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingDept) {
        toast.error("A department with this name already exists");
        return;
      }

      // Update department
      const { error } = await supabase
        .from("departments")
        .update({
          name: values.name,
          description: values.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", departmentToEdit.id);

      if (error) {
        throw error;
      }

      await loadDepartments();
      setShowEditDialog(false);
      setDepartmentToEdit(null);
      toast.success("Department updated successfully");
    } catch (error) {
      console.error("Error updating department:", error);
      toast.error("Failed to update department");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle department deletion
  const handleDelete = async () => {
    if (!departmentToDelete) return;

    try {
      setIsLoading(true);

      // Check if department is being used by any members
      const { data: memberDepts, error: checkError } = await supabase
        .from("member_departments")
        .select("member_id")
        .eq("department_id", departmentToDelete.id);

      if (checkError) {
        throw checkError;
      }

      if (memberDepts && memberDepts.length > 0) {
        toast.error(`Cannot delete department. It is assigned to ${memberDepts.length} member(s).`);
        setShowDeleteDialog(false);
        setDepartmentToDelete(null);
        return;
      }

      // Delete department
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", departmentToDelete.id);

      if (error) {
        throw error;
      }

      await loadDepartments();
      toast.success("Department deleted successfully");
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Failed to delete department");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setDepartmentToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Add New Department</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter department name" {...field} />
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
                      placeholder="Enter department description"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Department"}
            </Button>
          </form>
        </Form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Departments</h2>

        {departments.length === 0 ? (
          <p className="text-muted-foreground">No departments added yet</p>
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
                {departments.map((department) => (
                  <tr key={department.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{department.name}</td>
                    <td className="px-4 py-3 text-sm">{department.description || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDepartmentToEdit(department);
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
                            setDepartmentToDelete(department);
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

      {/* Edit Department Dialog */}
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
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update the department details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter department name" {...field} />
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
                        placeholder="Enter department description"
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
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the department "{departmentToDelete?.name}"? This action cannot be undone.
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
