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
import { CovenantFamily } from "@/types/member";

// Define the form schema
const groupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  description: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export function GroupSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<CovenantFamily[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<CovenantFamily | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<CovenantFamily | null>(null);

  // Initialize form
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Initialize edit form
  const editForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Load groups
  const loadGroups = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("covenant_families")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setGroups(data || []);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  };

  // Load groups on component mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Set edit form values when group to edit changes
  useEffect(() => {
    if (groupToEdit) {
      editForm.reset({
        name: groupToEdit.name,
        description: groupToEdit.description || "",
      });
    }
  }, [groupToEdit, editForm]);

  // Handle form submission
  const onSubmit = async (values: GroupFormValues) => {
    try {
      setIsLoading(true);

      // Check if group with same name already exists
      const { data: existingGroup, error: checkError } = await supabase
        .from("covenant_families")
        .select("id")
        .eq("name", values.name)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingGroup) {
        toast.error("A group with this name already exists");
        return;
      }

      // Insert new group
      const { error } = await supabase
        .from("covenant_families")
        .insert({
          name: values.name,
          description: values.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Reset form and reload groups
      form.reset({
        name: "",
        description: "",
      });

      await loadGroups();
      toast.success("Group added successfully");
    } catch (error) {
      console.error("Error adding group:", error);
      toast.error("Failed to add group");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit form submission
  const onEditSubmit = async (values: GroupFormValues) => {
    if (!groupToEdit) return;

    try {
      setIsLoading(true);

      // Check if group with same name already exists (excluding the current group)
      const { data: existingGroup, error: checkError } = await supabase
        .from("covenant_families")
        .select("id")
        .eq("name", values.name)
        .neq("id", groupToEdit.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingGroup) {
        toast.error("A group with this name already exists");
        return;
      }

      // Update group
      const { error } = await supabase
        .from("covenant_families")
        .update({
          name: values.name,
          description: values.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupToEdit.id);

      if (error) {
        throw error;
      }

      await loadGroups();
      setShowEditDialog(false);
      setGroupToEdit(null);
      toast.success("Group updated successfully");
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle group deletion
  const handleDelete = async () => {
    if (!groupToDelete) return;

    try {
      setIsLoading(true);

      // Check if group is being used by any members
      const { data: members, error: checkError } = await supabase
        .from("members")
        .select("id")
        .eq("covenant_family_id", groupToDelete.id);

      if (checkError) {
        throw checkError;
      }

      if (members && members.length > 0) {
        toast.error(`Cannot delete group. It is assigned to ${members.length} member(s).`);
        setShowDeleteDialog(false);
        setGroupToDelete(null);
        return;
      }

      // Delete group
      const { error } = await supabase
        .from("covenant_families")
        .delete()
        .eq("id", groupToDelete.id);

      if (error) {
        throw error;
      }

      await loadGroups();
      toast.success("Group deleted successfully");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setGroupToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Add New Group</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter group name" {...field} />
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
                      placeholder="Enter group description"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Group"}
            </Button>
          </form>
        </Form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Groups (Covenant Families)</h2>

        {groups.length === 0 ? (
          <p className="text-muted-foreground">No groups added yet</p>
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
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{group.name}</td>
                    <td className="px-4 py-3 text-sm">{group.description || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setGroupToEdit(group);
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
                            setGroupToDelete(group);
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

      {/* Edit Group Dialog */}
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
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter group name" {...field} />
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
                        placeholder="Enter group description"
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
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the group "{groupToDelete?.name}"? This action cannot be undone.
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
