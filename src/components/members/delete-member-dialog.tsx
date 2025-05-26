"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
// Import the useMemberMutations hook for automatic query invalidation
import { useMemberMutations } from "@/hooks/useMembers";

interface Member {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  status: 'active' | 'inactive';
  [key: string]: any;
}

interface DeleteMemberDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberDelete?: (id: string) => void;
}

export function DeleteMemberDialog({ member, open, onOpenChange, onMemberDelete }: DeleteMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Get the delete mutation from the hook for automatic query invalidation
  const { deleteMember: deleteMemberMutation } = useMemberMutations();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // Validate member data
      if (!member?.id) {
        toast.error("Invalid member data. Please refresh and try again.");
        return;
      }

      // Use the React Query mutation which automatically handles query invalidation
      const result = await deleteMemberMutation.mutateAsync(member.id);

      if (result?.error) {
        console.error("Error deleting member:", result.error);

        // Provide more specific error messages based on the error type
        const errorMessage = result.error.message || "Failed to delete member";
        if (errorMessage.includes("Invalid member ID")) {
          toast.error("Invalid member ID. Please refresh the page and try again.");
        } else if (errorMessage.includes("not found") || errorMessage.includes("does not exist")) {
          toast.error("Member not found. It may have already been deleted.");
        } else {
          toast.error(`Failed to delete member: ${errorMessage}`);
        }
        return;
      }

      // Notify parent component about the deletion
      if (onMemberDelete) {
        onMemberDelete(member.id);
      }

      toast.success(`${member.firstName} ${member.lastName} has been deleted successfully`);
      onOpenChange(false);
    } catch (error) {
      console.error("Unexpected error deleting member:", error);

      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.message.includes("timeout")) {
          toast.error("Request timed out. Please try again.");
        } else {
          toast.error(`Error: ${error.message}`);
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!member) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[500px] p-0 overflow-hidden">
        <div className="bg-destructive/5 p-6 border-b border-destructive/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-destructive">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2">
              This action will permanently delete <span className="font-semibold text-foreground">{member.firstName} {member.lastName}</span> from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <div className="p-4 bg-card">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 mb-4">
            <div className="bg-destructive/10 p-3 rounded-full">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-medium">This will delete:</p>
              <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                <li>All personal information</li>
                <li>Contact details</li>
                <li>Membership records</li>
                <li>Attendance history</li>
              </ul>
            </div>
          </div>
        </div>
        <AlertDialogFooter className="p-4 border-t bg-muted/10 flex justify-end gap-2">
          <AlertDialogCancel disabled={isLoading} className="mt-0">Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="gap-2 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Member
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
