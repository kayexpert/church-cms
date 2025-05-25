"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { messageTemplateSchema } from "@/schemas/messaging-schema";
import { MessageTemplateFormValues } from "@/types/messaging";
import { personalizeMessage } from "@/utils/message-utils";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";



interface MessageTemplateFormProps {
  onSubmit: (values: MessageTemplateFormValues) => Promise<void>;
  isSubmitting: boolean;
  initialValues?: MessageTemplateFormValues;
}

export function MessageTemplateForm({ onSubmit, isSubmitting, initialValues }: MessageTemplateFormProps) {
  // Initialize form with default values or initial values if provided
  const form = useForm<MessageTemplateFormValues>({
    resolver: zodResolver(messageTemplateSchema),
    defaultValues: {
      name: initialValues?.name || "",
      content: initialValues?.content || "",
      message_type: initialValues?.message_type || "text",
      supports_scheduling: initialValues?.supports_scheduling || false,
      personalization_tokens: initialValues?.personalization_tokens || []
    },
    mode: "onChange" // Enable real-time validation as the user types
  });

  // Handle form submission
  const handleSubmit = async (values: MessageTemplateFormValues) => {
    await onSubmit(values);
    form.reset();
  };

  // State for managing personalization tokens
  const [newToken, setNewToken] = useState<string>("");

  // State for preview dialog
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  // Sample data for preview
  const sampleData = {
    first_name: "John",
    last_name: "Doe",
    phone: "+233123456789",
    email: "john.doe@example.com",
    church: "Grace Community Church",
    group: "Youth Ministry",
    date: new Date().toLocaleDateString(),
    time: "10:00 AM",
    amount: "GHS 100.00"
  };

  // Update preview content when template content changes
  useEffect(() => {
    const content = form.watch("content");

    // Create a mock member object with sample data
    const mockMember = {
      id: "sample-id",
      first_name: sampleData.first_name,
      last_name: sampleData.last_name,
      primary_phone_number: sampleData.phone,
      email: sampleData.email,
      status: "active"
    };

    // Use the shared personalizeMessage function for consistency
    const processedContent = personalizeMessage(content, mockMember);

    setPreviewContent(processedContent);
  }, [form.watch("content")]);

  // Function to add a new personalization token
  const addPersonalizationToken = () => {
    if (!newToken.trim()) return;

    const currentTokens = form.getValues("personalization_tokens") || [];
    if (!currentTokens.includes(newToken)) {
      form.setValue("personalization_tokens", [...currentTokens, newToken]);
    }
    setNewToken("");
  };

  // Function to remove a personalization token
  const removePersonalizationToken = (token: string) => {
    const currentTokens = form.getValues("personalization_tokens") || [];
    form.setValue(
      "personalization_tokens",
      currentTokens.filter(t => t !== token)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter template name" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this template
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter template content"
                  className="min-h-32"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The content of the message template. You can use personalization tokens like {"{first_name}"}, {"{last_name}"}, etc.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select message type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text">Text (Standard SMS)</SelectItem>
                  <SelectItem value="unicode">Unicode (Special characters)</SelectItem>
                  <SelectItem value="flash">Flash (Appears immediately)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The type of SMS message to send. Standard text is recommended for most cases.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supports_scheduling"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Support Scheduling
                </FormLabel>
                <FormDescription>
                  Allow this template to be scheduled for future delivery
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

        <FormField
          control={form.control}
          name="personalization_tokens"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personalization Tokens</FormLabel>
              <div className="flex flex-row gap-2 mb-2">
                <FormControl>
                  <Input
                    placeholder="Add a token (e.g. first_name)"
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPersonalizationToken();
                      }
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPersonalizationToken}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {field.value?.map((token, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {`{${token}}`}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removePersonalizationToken(token)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <FormDescription>
                Define tokens that can be replaced with recipient data (e.g., first_name, last_name)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            disabled={!form.getValues("content")}
          >
            Preview Template
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Create Template'
            )}
          </Button>
        </div>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                Preview how your template will look with sample data
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="p-4 border rounded-md bg-muted/30">
                <div className="whitespace-pre-wrap">{previewContent}</div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Sample data used:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(sampleData).map(([key, value]) => (
                    <li key={key}><span className="font-mono">{`{${key}}`}</span> → {value}</li>
                  ))}
                </ul>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Close Preview</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}
