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
import { Certificate } from "@/types/member";

// Define the form schema
const certificateSchema = z.object({
  name: z.string().min(2, "Certificate name must be at least 2 characters"),
  description: z.string().optional(),
});

type CertificateFormValues = z.infer<typeof certificateSchema>;

export function CertificateSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [certificateToEdit, setCertificateToEdit] = useState<Certificate | null>(null);

  // Initialize form
  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Initialize edit form
  const editForm = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Load certificates
  const loadCertificates = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setCertificates(data || []);
    } catch (error) {
      console.error("Error loading certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setIsLoading(false);
    }
  };

  // Load certificates on component mount
  useEffect(() => {
    loadCertificates();
  }, []);

  // Set edit form values when certificate to edit changes
  useEffect(() => {
    if (certificateToEdit) {
      editForm.reset({
        name: certificateToEdit.name,
        description: certificateToEdit.description || "",
      });
    }
  }, [certificateToEdit, editForm]);

  // Handle form submission
  const onSubmit = async (values: CertificateFormValues) => {
    try {
      setIsLoading(true);

      // Check if certificate with same name already exists
      const { data: existingCert, error: checkError } = await supabase
        .from("certificates")
        .select("id")
        .eq("name", values.name)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingCert) {
        toast.error("A certificate with this name already exists");
        return;
      }

      // Insert new certificate
      const { error } = await supabase
        .from("certificates")
        .insert({
          name: values.name,
          description: values.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Reset form and reload certificates
      form.reset({
        name: "",
        description: "",
      });

      await loadCertificates();
      toast.success("Certificate added successfully");
    } catch (error) {
      console.error("Error adding certificate:", error);
      toast.error("Failed to add certificate");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit form submission
  const onEditSubmit = async (values: CertificateFormValues) => {
    if (!certificateToEdit) return;

    try {
      setIsLoading(true);

      // Check if certificate with same name already exists (excluding the current certificate)
      const { data: existingCert, error: checkError } = await supabase
        .from("certificates")
        .select("id")
        .eq("name", values.name)
        .neq("id", certificateToEdit.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingCert) {
        toast.error("A certificate with this name already exists");
        return;
      }

      // Update certificate
      const { error } = await supabase
        .from("certificates")
        .update({
          name: values.name,
          description: values.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", certificateToEdit.id);

      if (error) {
        throw error;
      }

      await loadCertificates();
      setShowEditDialog(false);
      setCertificateToEdit(null);
      toast.success("Certificate updated successfully");
    } catch (error) {
      console.error("Error updating certificate:", error);
      toast.error("Failed to update certificate");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle certificate deletion
  const handleDelete = async () => {
    if (!certificateToDelete) return;

    try {
      setIsLoading(true);

      // Check if certificate is being used by any members
      const { data: memberCerts, error: checkError } = await supabase
        .from("member_certificates")
        .select("member_id")
        .eq("certificate_id", certificateToDelete.id);

      if (checkError) {
        throw checkError;
      }

      if (memberCerts && memberCerts.length > 0) {
        toast.error(`Cannot delete certificate. It is assigned to ${memberCerts.length} member(s).`);
        setShowDeleteDialog(false);
        setCertificateToDelete(null);
        return;
      }

      // Delete certificate
      const { error } = await supabase
        .from("certificates")
        .delete()
        .eq("id", certificateToDelete.id);

      if (error) {
        throw error;
      }

      await loadCertificates();
      toast.success("Certificate deleted successfully");
    } catch (error) {
      console.error("Error deleting certificate:", error);
      toast.error("Failed to delete certificate");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setCertificateToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Add New Certificate</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificate Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter certificate name" {...field} />
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
                      placeholder="Enter certificate description"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Certificate"}
            </Button>
          </form>
        </Form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Certificates</h2>

        {certificates.length === 0 ? (
          <p className="text-muted-foreground">No certificates added yet</p>
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
                {certificates.map((certificate) => (
                  <tr key={certificate.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{certificate.name}</td>
                    <td className="px-4 py-3 text-sm">{certificate.description || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCertificateToEdit(certificate);
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
                            setCertificateToDelete(certificate);
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

      {/* Edit Certificate Dialog */}
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
            <DialogTitle>Edit Certificate</DialogTitle>
            <DialogDescription>
              Update the certificate details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter certificate name" {...field} />
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
                        placeholder="Enter certificate description"
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
            <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the certificate "{certificateToDelete?.name}"? This action cannot be undone.
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
