"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, HelpCircle } from "lucide-react";
import { MessagingConfigFormValues } from "@/types/messaging";
import { messagingConfigSchema } from "@/schemas/messaging-config-schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DialogFooter } from "@/components/ui/dialog";

interface SMSProviderFormProps {
  initialValues?: Partial<MessagingConfigFormValues>;
  onSubmit: (values: MessagingConfigFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function SMSProviderForm({ initialValues, onSubmit, isSubmitting, onCancel }: SMSProviderFormProps) {
  // Initialize form with default values or initial values if provided
  const form = useForm<MessagingConfigFormValues>({
    resolver: zodResolver(messagingConfigSchema),
    defaultValues: {
      provider_name: 'wigal', // Wigal is the only provider
      api_key: initialValues?.api_key || '',
      api_secret: initialValues?.api_secret || '',
      base_url: 'https://frogapi.wigal.com.gh', // Fixed Wigal API URL
      auth_type: 'api_key', // Fixed auth type for Wigal
      sender_id: initialValues?.sender_id || '',
      is_default: initialValues?.is_default !== undefined ? initialValues.is_default : true, // Default to true for new configs
    },
    mode: "onSubmit" // Only validate when the form is submitted
  });

  // Debug form state
  console.log('Form errors:', form.formState.errors);
  console.log('Form values:', form.getValues());

  // Handle form submission
  const handleSubmit = async (values: MessagingConfigFormValues) => {
    try {
      // Set Wigal-specific values
      values.provider_name = 'wigal';
      values.base_url = 'https://frogapi.wigal.com.gh';
      values.auth_type = 'api_key';

      // Ensure is_default is explicitly set as a boolean
      values.is_default = values.is_default === true;

      // Log the final values being submitted
      console.log('Submitting Wigal SMS provider configuration:', {
        hasApiKey: !!values.api_key,
        hasApiSecret: !!values.api_secret,
        hasSenderId: !!values.sender_id,
        isDefault: values.is_default
      });

      await onSubmit(values);
      form.reset();
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        <div className="bg-muted/30 p-4 rounded-lg mb-4">
          <h3 className="text-base font-medium mb-2">Wigal SMS Provider</h3>
          <p className="text-sm text-muted-foreground">
            This application uses Wigal SMS as the exclusive SMS provider for sending messages.
          </p>
        </div>

        <Alert className="w-full mb-4 p-4">
          <HelpCircle className="h-5 w-5" />
          <AlertTitle className="text-base font-medium mb-1">Wigal SMS Configuration Help</AlertTitle>
          <AlertDescription className="w-full">
            <p className="mb-2">To configure Wigal SMS, you need the following credentials:</p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 w-full">
              <ul className="list-none space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1 mr-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  </span>
                  <div>
                    <strong className="font-medium">API Key:</strong>
                    <p className="text-muted-foreground">Found in your Wigal dashboard (used as API-KEY header)</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1 mr-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  </span>
                  <div>
                    <strong className="font-medium">Username:</strong>
                    <p className="text-muted-foreground">Your Wigal account username (used as USERNAME header)</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1 mr-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  </span>
                  <div>
                    <strong className="font-medium">Sender ID:</strong>
                    <p className="text-muted-foreground">A registered sender ID (3-11 characters)</p>
                  </div>
                </li>
              </ul>
              <div className="flex flex-col justify-center bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  If you don't have these credentials, please contact Wigal support or visit
                  <a
                    href="https://frog.wigal.com.gh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline ml-1"
                  >
                    the Wigal dashboard
                  </a>.
                </p>
                <p className="text-muted-foreground mt-2">
                  Make sure your Sender ID is registered and approved by Wigal before using it.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <FormField
          control={form.control}
          name="api_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wigal API Key (API-KEY)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your Wigal API Key"
                  {...field}
                  autoComplete="off"
                />
              </FormControl>
              <FormDescription>
                The API Key provided by Wigal (sent as API-KEY header for authentication)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="api_secret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wigal Username (USERNAME)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your Wigal Username"
                  {...field}
                  autoComplete="off"
                />
              </FormControl>
              <FormDescription>
                Your Wigal account username (sent as USERNAME header for authentication)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sender_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sender ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your Sender ID"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter a registered Sender ID (3-11 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="bg-muted/30 p-4 rounded-lg mb-4">
          <h3 className="text-base font-medium mb-2">API Information</h3>
          <p className="text-sm text-muted-foreground mb-2">
            The following settings are automatically configured for Wigal SMS:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>Base URL: https://frogapi.wigal.com.gh</li>
            <li>Authentication Type: API Key</li>
          </ul>
        </div>

        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Set as Default Provider
                </FormLabel>
                <FormDescription>
                  Use this Wigal configuration as the default for sending messages
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
