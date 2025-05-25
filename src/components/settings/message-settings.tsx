"use client";

import React, { useState, Suspense, lazy, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageTemplateForm } from "@/components/settings/messages/message-template-form";
import { MessageTemplateList } from "@/components/settings/messages/message-template-list";
import { Button } from "@/components/ui/button";
import { MessageTemplateFormValues } from "@/types/messaging";
import { useMessageTemplateMutations } from "@/hooks/use-messaging";
import {
  MessageSettingsSkeleton,
  MessageLogListSkeleton,
  SMSProviderConfigSkeleton,
  CostTrackingSkeleton
} from "@/components/settings/messages/message-settings-skeleton";
import { useMessaging } from "@/contexts/messaging-context";

// Lazy load components for better performance
const MessageLogList = lazy(() => import('@/components/settings/messages/message-log-list'));
const SMSProviderConfigTab = lazy(() => import('@/components/settings/messages/sms-provider-config-tab'));
const CostTrackingTab = lazy(() => import('@/components/settings/messages/cost-tracking-tab'));

export function MessageSettings() {
  const [activeTab, setActiveTab] = useState("templates");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { createTemplate } = useMessageTemplateMutations();
  const { refreshTemplates, refreshProviders } = useMessaging();

  // We'll use a ref to track if settings have been modified
  const settingsModified = React.useRef(false);

  // Mark settings as modified when templates are refreshed
  const handleTemplateRefresh = useCallback(() => {
    settingsModified.current = true;
    refreshTemplates();
  }, [refreshTemplates]);

  // Mark settings as modified when providers are refreshed
  const handleProviderRefresh = useCallback(() => {
    settingsModified.current = true;
    refreshProviders();
  }, [refreshProviders]);

  // Handle tab change with memoization
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    // Refresh data when switching to specific tabs
    if (value === "templates") {
      handleTemplateRefresh();
    } else if (value === "configuration") {
      handleProviderRefresh();
    }
  }, [handleTemplateRefresh, handleProviderRefresh]);

  const handleSubmit = useCallback(async (values: MessageTemplateFormValues) => {
    await createTemplate.mutateAsync({
      name: values.name,
      content: values.content
    });
    setRefreshTrigger(prev => prev + 1);

    // Refresh templates in other components
    handleTemplateRefresh();
  }, [createTemplate, handleTemplateRefresh, setRefreshTrigger]);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="text-2xl font-semibold">Message Settings</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Manage message templates, view logs, and configure messaging providers.
        </p>

        <Tabs
          defaultValue="templates"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          {/* Desktop Tabs */}
          <div className="hidden md:block">
            <TabsList className="mb-6">
              <TabsTrigger value="templates">
                Message Templates
              </TabsTrigger>
              <TabsTrigger value="logs">
                Message Logs
              </TabsTrigger>
              <TabsTrigger value="configuration">
                Configuration
              </TabsTrigger>
              <TabsTrigger value="cost-tracking">
                Cost Tracking
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Mobile Dropdown */}
          <div className="block md:hidden mb-6">
            <Select
              value={activeTab}
              onValueChange={handleTabChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="templates">Message Templates</SelectItem>
                <SelectItem value="logs">Message Logs</SelectItem>
                <SelectItem value="configuration">Configuration</SelectItem>
                <SelectItem value="cost-tracking">Cost Tracking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="templates">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-medium mb-4">Create Template</h2>
                <MessageTemplateForm
                  onSubmit={handleSubmit}
                  isSubmitting={createTemplate.isPending}
                />
              </div>

              <div>
                <h2 className="text-xl font-medium mb-4">Templates</h2>
                <MessageTemplateList refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <div>
              <h2 className="text-xl font-medium mb-4">Message Logs</h2>
              <Suspense fallback={<MessageLogListSkeleton />}>
                {activeTab === "logs" && <MessageLogList />}
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="configuration">
            <div>
              <h2 className="text-xl font-medium mb-4">SMS Provider Configuration</h2>
              <Suspense fallback={<SMSProviderConfigSkeleton />}>
                {activeTab === "configuration" && <SMSProviderConfigTab />}
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="cost-tracking">
            <div>
              <h2 className="text-xl font-medium mb-4">SMS Cost Tracking</h2>
              <Suspense fallback={<CostTrackingSkeleton />}>
                {activeTab === "cost-tracking" && <CostTrackingTab />}
              </Suspense>
            </div>
          </TabsContent>


        </Tabs>
      </div>
    </Card>
  );
}

// Wrapper component with Suspense for lazy loading
export function MessageSettingsWithSuspense() {
  return (
    <Suspense fallback={<MessageSettingsSkeleton />}>
      <MessageSettings />
    </Suspense>
  );
}
