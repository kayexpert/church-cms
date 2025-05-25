"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Check, AlertCircle, Phone, Edit, Trash2 } from "lucide-react";
import { MessagingConfiguration, MessagingConfigFormValues } from "@/types/messaging";
import { supabase } from "@/lib/supabase";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Custom components
import { SMSProviderForm } from "./sms-provider-form";
import { SMSProviderTestForm } from "./sms-provider-test-form";

/**
 * SMS Provider Configuration Tab
 *
 * This component handles the display and management of SMS provider configurations.
 * It includes functionality for creating, editing, testing, and deleting configurations.
 */
function SMSProviderConfigTab() {
  // State for dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MessagingConfiguration | null>(null);
  const [isTableCreationNeeded, setIsTableCreationNeeded] = useState(false);
  const [isCreatingTables, setIsCreatingTables] = useState(false);

  const queryClient = useQueryClient();

  // Fetch SMS provider configurations
  const {
    data: configs = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["messagingConfigurations"],
    queryFn: async () => {
      try {
        // First, try to prioritize real providers
        try {
          console.log('Prioritizing real SMS providers');
          const prioritizeResponse = await fetch('/api/messaging/prioritize-real-provider', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const prioritizeData = await prioritizeResponse.json();

          if (prioritizeResponse.ok && prioritizeData.success) {
            console.log('Successfully prioritized real SMS provider:', prioritizeData.message);
          } else {
            console.warn('Could not prioritize real SMS provider:', prioritizeData.error || prioritizeData.message || 'Unknown error');
          }
        } catch (prioritizeError) {
          console.error('Error prioritizing real SMS provider:', prioritizeError);
          // Continue anyway, we'll try to get the configurations
        }

        // Use the admin route to bypass RLS
        const response = await fetch("/api/messaging/config/admin");

        if (!response.ok) {
          // If we get a 404 or 500, the table might not exist
          if (response.status === 404 || response.status === 500) {
            setIsTableCreationNeeded(true);
            return [];
          }
          throw new Error(`Failed to fetch configurations: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data as MessagingConfiguration[];
      } catch (error) {
        console.error('Error fetching SMS provider configurations:', error);
        // Check if the error is related to missing tables
        if (error instanceof Error &&
            (error.message.includes("relation") ||
             error.message.includes("does not exist"))) {
          setIsTableCreationNeeded(true);
        }
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
  });

  // Create mutation
  const createConfig = useMutation({
    mutationFn: async (config: MessagingConfigFormValues) => {
      // Use the admin route to bypass RLS
      const response = await fetch("/api/messaging/config/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from server:', errorData);
        throw new Error(
          errorData.details ||
          errorData.message ||
          errorData.error ||
          "Failed to create SMS provider configuration"
        );
      }

      const data = await response.json();
      return data.data as MessagingConfiguration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messagingConfigurations"] });
      toast.success("SMS provider configuration created successfully");
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error creating SMS provider configuration: ${error.message}`);
    },
  });

  // Update mutation
  const updateConfig = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: MessagingConfigFormValues }) => {
      // Use the admin route to bypass RLS
      const response = await fetch(`/api/messaging/config/admin/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update SMS provider configuration");
      }

      const data = await response.json();
      return data.data as MessagingConfiguration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messagingConfigurations"] });
      toast.success("SMS provider configuration updated successfully");
      setIsEditDialogOpen(false);
      setSelectedConfig(null);
    },
    onError: (error) => {
      toast.error(`Error updating SMS provider configuration: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      // Use the admin route to bypass RLS
      const response = await fetch(`/api/messaging/config/admin/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if this is the default provider error
        if (errorData.error && errorData.error.includes('default configuration')) {
          throw new Error("Cannot delete the default SMS provider. Please set another provider as default first.");
        }

        throw new Error(errorData.message || errorData.error || "Failed to delete SMS provider configuration");
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messagingConfigurations"] });
      toast.success("SMS provider configuration deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedConfig(null);
    },
    onError: (error) => {
      // Check if this is the default provider error
      if (error.message.includes('default')) {
        toast.error(error.message);
      } else {
        toast.error(`Error deleting SMS provider configuration: ${error.message}`);
      }
    },
  });

  // Test mutation
  const testConfig = useMutation({
    mutationFn: async ({ config, phoneNumber, senderId }: { config: MessagingConfigFormValues; phoneNumber: string; senderId?: string }) => {
      const response = await fetch("/api/messaging/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          phoneNumber,
          senderId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to test SMS provider configuration");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Test message sent successfully");
    },
    onError: (error) => {
      toast.error(`Error testing SMS provider configuration: ${error.message}`);
    },
  });

  // Create database tables
  const createTables = async () => {
    setIsCreatingTables(true);
    try {
      const response = await fetch("/api/db/apply-messaging-config-migration", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create database tables");
      }

      toast.success("Database tables created successfully");
      setIsTableCreationNeeded(false);
      // Refetch configurations after tables are created
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error('Error creating database tables:', error);
      toast.error(`Failed to create database tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingTables(false);
    }
  };

  // Form submission handlers
  const handleCreateSubmit = async (values: MessagingConfigFormValues) => {
    await createConfig.mutateAsync(values);
  };

  const handleEditSubmit = async (values: MessagingConfigFormValues) => {
    if (selectedConfig) {
      await updateConfig.mutateAsync({ id: selectedConfig.id, config: values });
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedConfig) {
      // Check if this is the default provider
      if (selectedConfig.is_default) {
        toast.error("Cannot delete the default SMS provider. Please set another provider as default first.");
        setIsDeleteDialogOpen(false);
        return;
      }

      await deleteConfig.mutateAsync(selectedConfig.id);
    }
  };

  // Helper function to get provider label
  const getProviderLabel = (provider: string) => {
    // Only Wigal is supported
    return 'Wigal SMS';
  };

  // Render database migration helper if needed
  if (isTableCreationNeeded) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Database Setup Required</AlertTitle>
        <AlertDescription>
          <p className="mb-4">
            The messaging configuration tables need to be created in the database.
          </p>
          <Button
            onClick={createTables}
            disabled={isCreatingTables}
          >
            {isCreatingTables ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Tables...
              </>
            ) : (
              'Create Database Tables'
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Render loading state
  if (isLoading) {
    return <SMSProviderConfigSkeleton />;
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load SMS provider configurations. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-lg md:text-xl font-medium">Wigal SMS Configuration</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Configure Wigal SMS
        </Button>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-4 md:py-6">
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Wigal SMS Not Configured</AlertTitle>
                <AlertDescription>
                  You need to set up Wigal SMS to send messages. Messages cannot be sent until Wigal is configured.
                </AlertDescription>
              </Alert>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                No Wigal SMS configuration found. Configure Wigal SMS to start sending messages.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Configure Wigal SMS
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base md:text-lg">{getProviderLabel(config.provider_name)}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {config.provider_name === 'custom' ? config.base_url : `API Key: ${config.api_key ? '••••••••' : 'Not set'}`}
                    </CardDescription>
                  </div>
                  {config.is_default && (
                    <Badge variant="outline" className="ml-2">
                      <Check className="mr-1 h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-xs md:text-sm text-muted-foreground">
                  <p>Auth Type: {config.auth_type || 'Not specified'}</p>
                  {config.provider_name === 'custom' && (
                    <p className="mt-1">Base URL: {config.base_url}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs md:text-sm"
                  onClick={() => {
                    setSelectedConfig(config);
                    setIsTestDialogOpen(true);
                  }}
                >
                  <Phone className="mr-1 h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs md:text-sm"
                  onClick={() => {
                    setSelectedConfig(config);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="mr-1 h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs md:text-sm"
                  onClick={() => {
                    setSelectedConfig(config);
                    setIsDeleteDialogOpen(true);

                    // Show a toast if this is the default provider
                    if (config.is_default) {
                      toast.warning("Default providers cannot be deleted. Set another provider as default first.");
                    }
                  }}
                >
                  <Trash2 className="mr-1 h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="pb-2">
            <DialogTitle>Configure Wigal SMS</DialogTitle>
            <DialogDescription>
              Set up Wigal SMS for sending messages
            </DialogDescription>
          </DialogHeader>
          <SMSProviderForm
            onSubmit={handleCreateSubmit}
            isSubmitting={createConfig.isPending}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="pb-2">
            <DialogTitle>Edit Wigal SMS Configuration</DialogTitle>
            <DialogDescription>
              Update your Wigal SMS settings
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <SMSProviderForm
              initialValues={{
                provider_name: selectedConfig.provider_name,
                api_key: selectedConfig.api_key,
                api_secret: selectedConfig.api_secret,
                base_url: selectedConfig.base_url,
                auth_type: selectedConfig.auth_type,
                sender_id: selectedConfig.sender_id,
                is_default: selectedConfig.is_default,
              }}
              onSubmit={handleEditSubmit}
              isSubmitting={updateConfig.isPending}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            {selectedConfig?.is_default ? (
              <>
                <AlertDialogDescription className="text-destructive font-medium mb-2">
                  Cannot delete the default SMS provider.
                </AlertDialogDescription>
                <AlertDialogDescription>
                  Please set another provider as default first before deleting this one.
                </AlertDialogDescription>
              </>
            ) : (
              <AlertDialogDescription>
                This will permanently delete the SMS provider configuration.
                This action cannot be undone.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfig.isPending || (selectedConfig?.is_default ?? false)}
            >
              {deleteConfig.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="pb-2">
            <DialogTitle>Test Wigal SMS</DialogTitle>
            <DialogDescription>
              Send a test message to verify your Wigal SMS configuration
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <SMSProviderTestForm
              config={selectedConfig}
              onClose={() => setIsTestDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Skeleton loader for the SMS provider config list
function SMSProviderConfigSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="pb-2">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 pt-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default SMSProviderConfigTab;