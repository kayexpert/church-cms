"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Eye, Trash } from "lucide-react";
import { useMessageTemplates, useMessageTemplateMutations } from "@/hooks/use-messaging";
import { MessageTemplate } from "@/types/messaging";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { MessageTemplateForm } from "./message-template-form";

interface MessageTemplateListProps {
  refreshTrigger?: number;
}

export function MessageTemplateList({ refreshTrigger = 0 }: MessageTemplateListProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Bulk actions state
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const { data: templates = [], isLoading, refetch } = useMessageTemplates();
  const { updateTemplate, deleteTemplate } = useMessageTemplateMutations();

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const handleView = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdate = async (values: { name: string; content: string }) => {
    if (selectedTemplate) {
      await updateTemplate.mutateAsync({
        id: selectedTemplate.id,
        template: values
      });
      setIsEditDialogOpen(false);
      refetch();
    }
  };

  const confirmDelete = async () => {
    if (selectedTemplate) {
      await deleteTemplate.mutateAsync(selectedTemplate.id);
      setIsDeleteDialogOpen(false);
      refetch();
    }
  };

  // Handle bulk delete
  const confirmBulkDelete = async () => {
    if (selectedTemplates.length > 0) {
      try {
        // Delete templates one by one
        for (const id of selectedTemplates) {
          await deleteTemplate.mutateAsync(id);
        }
        setIsBulkDeleteDialogOpen(false);
        setSelectedTemplates([]);
        refetch();
      } catch (error) {
        console.error("Error deleting templates:", error);
      }
    }
  };

  // Toggle template selection
  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplates(prev =>
      prev.includes(id)
        ? prev.filter(templateId => templateId !== id)
        : [...prev, id]
    );
  };

  // Toggle all templates selection
  const toggleAllTemplates = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(templates.map(t => t.id));
    }
  };

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div>
      {/* Bulk actions toolbar */}
      {templates.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectedTemplates.length === templates.length && templates.length > 0}
              onCheckedChange={toggleAllTemplates}
              aria-label="Select all templates"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {selectedTemplates.length === 0
                ? "Select all"
                : `Selected ${selectedTemplates.length} of ${templates.length}`}
            </label>
          </div>

          {selectedTemplates.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="flex items-center gap-1"
            >
              <Trash className="h-4 w-4" />
              Delete Selected
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Content Preview</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id} className={selectedTemplates.includes(template.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTemplates.includes(template.id)}
                      onCheckedChange={() => toggleTemplateSelection(template.id)}
                      aria-label={`Select ${template.name} template`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {template.content.length > 50
                      ? `${template.content.substring(0, 50)}...`
                      : template.content}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(template)}
                        title="View Template"
                        aria-label={`View ${template.name} template`}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                        title="Edit Template"
                        aria-label={`Edit ${template.name} template`}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template)}
                        title="Delete Template"
                        aria-label={`Delete ${template.name} template`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Template Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
            <DialogDescription>
              View the details of this template
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p>{selectedTemplate.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Content</h4>
                <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {selectedTemplate.content}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the details of this template
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <MessageTemplateForm
              onSubmit={handleUpdate}
              isSubmitting={updateTemplate.isPending}
              initialValues={{
                name: selectedTemplate.name,
                content: selectedTemplate.content
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template <strong>{selectedTemplate?.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedTemplate && (
            <div className="my-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Template content:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                {selectedTemplate.content}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? "Deleting..." : "Delete Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Templates</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTemplates.length} selected templates?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Selected templates:</p>
            <ul className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
              {selectedTemplates.map(id => {
                const template = templates.find(t => t.id === id);
                return template ? (
                  <li key={id} className="mb-1">• {template.name}</li>
                ) : null;
              })}
            </ul>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? "Deleting..." : `Delete ${selectedTemplates.length} Templates`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
