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
// Import the deleteMember function from the member service
import { deleteMember } from "@/services/member-service";

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

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // Call the delete member service
      const response = await deleteMember(member.id);

      if (response.error) {
        console.error("Error deleting member:", response.error);
        toast.error("Failed to delete member. Please try again.");
        return;
      }

      // Notify parent component about the deletion
      if (onMemberDelete) {
        onMemberDelete(member.id);
      }

      toast.success("Member deleted successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Unexpected error deleting member:", error);
      toast.error("An unexpected error occurred. Please try again.");
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
