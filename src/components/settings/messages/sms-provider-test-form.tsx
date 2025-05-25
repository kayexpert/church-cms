"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { z } from "zod";
import { MessagingConfiguration } from "@/types/messaging";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Schema for test form
const testFormSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  senderId: z.string().min(3).max(11).optional(),
});

type TestFormValues = z.infer<typeof testFormSchema>;

interface SMSProviderTestFormProps {
  config: MessagingConfiguration;
  onClose: () => void;
}

export function SMSProviderTestForm({ config, onClose }: SMSProviderTestFormProps) {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with appropriate defaults based on provider
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      phoneNumber: '',
      // Use the configured sender ID if available, otherwise use a default
      senderId: config.sender_id ||
                ((config.provider_name === 'wigal' || config.provider_name === 'arkesel') ?
                'ChurchCMS' : undefined),
    },
    mode: "onChange" // Validate on change for better user experience
  });

  // Handle form submission
  const handleSubmit = async (values: TestFormValues) => {
    setIsSubmitting(true);
    setTestResult(null);

    try {
      console.log(`Testing SMS provider: ${config.provider_name} with phone: ${values.phoneNumber}`);

      const senderIdToUse = values.senderId || config.sender_id || 'ChurchCMS';
      console.log(`Sender ID details - Form value: "${values.senderId}", Config value: "${config.sender_id}", Will use: "${senderIdToUse}"`);

      // Determine the base URL based on provider
      let baseUrl = config.base_url;
      if (config.provider_name === 'wigal' && !baseUrl) {
        baseUrl = 'https://frogapi.wigal.com.gh';
      } else if (config.provider_name === 'arkesel' && !baseUrl) {
        baseUrl = 'https://api.arkesel.com';
      }

      // Log the base URL for debugging
      console.log(`Using base URL for ${config.provider_name}: ${baseUrl || 'default'}`);

      // Prepare the request payload
      // Use the form's sender ID if provided, otherwise use the config's sender ID, or fall back to default
      const defaultSenderId = (config.provider_name === 'wigal' || config.provider_name === 'arkesel') ? 'ChurchCMS' : undefined;
      const effectiveSenderId = values.senderId || config.sender_id || defaultSenderId;

      const payload = {
        config: {
          provider_name: config.provider_name,
          api_key: config.api_key,
          api_secret: config.api_secret,
          base_url: baseUrl,
          auth_type: config.auth_type,
          sender_id: effectiveSenderId,
        },
        phoneNumber: values.phoneNumber,
        senderId: effectiveSenderId,
      };

      // Log the full payload for debugging (with sensitive data redacted)
      const redactedPayload = {
        config: {
          ...payload.config,
          api_key: '***REDACTED***',
          api_secret: payload.config.api_secret ? '***REDACTED***' : undefined
        },
        phoneNumber: payload.phoneNumber,
        senderId: payload.senderId
      };
      console.log('Sending test request with payload:', JSON.stringify(redactedPayload, null, 2));

      // Log the endpoint and authentication method
      console.log(`Sending request to: ${config.provider_name} API`);
      console.log(`API Endpoint: ${'/api/messaging/config/test'}`);
      const authMethod = config.provider_name === 'wigal' ? 'API-KEY and USERNAME headers' :
                         config.provider_name === 'arkesel' ? 'API-KEY header' :
                         'Custom authentication';
      console.log(`Authentication: ${authMethod}`);

      const response = await fetch("/api/messaging/config/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Parse the response
      let responseData;
      try {
        responseData = await response.json();
        console.log("SMS test API response:", responseData);
      } catch (jsonError) {
        console.error("Error parsing SMS test API response:", jsonError);
        console.log("Raw response status:", response.status, response.statusText);

        // Try to get the raw text
        const rawText = await response.text();
        console.log("Raw response text:", rawText);

        // Create a basic response object
        responseData = {
          error: "Failed to parse API response",
          status: response.status,
          statusText: response.statusText,
          rawResponse: rawText
        };
      }

      if (!response.ok) {
        console.error("SMS test API error:", responseData);

        // Extract detailed error information
        let errorMessage = `Failed to send test message: ${response.status} ${response.statusText}`;

        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }

        // Check for more detailed error messages
        if (responseData.messages && Array.isArray(responseData.messages) && responseData.messages.length > 0) {
          errorMessage = responseData.messages.join('. ');
        }

        // Check for help text
        if (responseData.help) {
          errorMessage += `. ${responseData.help}`;
        }

        throw new Error(errorMessage);
      }

      console.log("SMS test successful:", responseData);
      setTestResult({
        success: true,
        message: responseData.message || `Test message sent successfully to ${values.phoneNumber}`
      });
    } catch (error) {
      console.error("Error testing SMS provider:", error);

      // Create a more user-friendly error message
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Check for specific error patterns and provide more helpful messages
      if (errorMessage.includes('404') && errorMessage.includes('NOT_FOUND')) {
        errorMessage = 'The SMS provider API endpoint could not be found. This could be due to an incorrect API URL or authentication issue.';
      } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please check your API key, username, and other credentials.';
      } else if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }

      setTestResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"} className="p-3">
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle className="text-sm font-medium">{testResult.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription className="text-xs">{testResult.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1234567890"
                    {...field}
                    autoComplete="tel"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Enter a phone number to send a test message to
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {(config.provider_name === 'wigal' || config.provider_name === 'arkesel') && (
            <FormField
              control={form.control}
              name="senderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your Sender ID"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Enter a registered Sender ID (3-11 characters)
                    {config.provider_name === 'wigal' && " for Wigal SMS"}
                    {config.provider_name === 'arkesel' && " for Arkesel SMS"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              size="sm"
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Testing...
                </>
              ) : (
                'Send Test Message'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}
