"use client";

import { useState, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChurchInformationForm } from "@/components/settings/general/church-information-form";
import { ProfileSettingsForm } from "@/components/settings/general/profile-settings-form";
import {
  ChurchInformationSkeleton,
  ProfileSettingsSkeleton
} from "@/components/settings/general/general-settings-skeleton";

interface GeneralSettingsProps {
  initialSection: string | null;
}

export function GeneralSettings({ initialSection }: GeneralSettingsProps) {
  const [activeTab, setActiveTab] = useState("church-information");

  // Set the active tab based on the initialSection prop
  useEffect(() => {
    if (initialSection === "profile") {
      setActiveTab("profile");
    }
  }, [initialSection]);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">General Settings</h1>

        <Tabs
          defaultValue="church-information"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6 flex overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
            <TabsTrigger value="church-information" className="whitespace-nowrap">
              Church Information
            </TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-nowrap">
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="church-information">
            <Suspense fallback={<ChurchInformationSkeleton />}>
              <ChurchInformationForm />
            </Suspense>
          </TabsContent>

          <TabsContent value="profile">
            <Suspense fallback={<ProfileSettingsSkeleton />}>
              <ProfileSettingsForm />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
