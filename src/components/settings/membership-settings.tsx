"use client";

import { useState, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentSettings } from "@/components/settings/membership/department-settings";
import { CertificateSettings } from "@/components/settings/membership/certificate-settings";
import { GroupSettings } from "@/components/settings/membership/group-settings";
import { EventCategorySettings } from "@/components/settings/membership/event-category-settings";
import {
  DepartmentSettingsSkeleton,
  CertificateSettingsSkeleton,
  GroupSettingsSkeleton,
  EventCategorySettingsSkeleton
} from "@/components/settings/membership/membership-settings-skeleton";

export function MembershipSettings() {
  const [activeTab, setActiveTab] = useState("departments");

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">Membership Settings</h1>

        <Tabs
          defaultValue="departments"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6 flex overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
            <TabsTrigger value="departments" className="whitespace-nowrap">
              Departments
            </TabsTrigger>
            <TabsTrigger value="certificates" className="whitespace-nowrap">
              Certificates
            </TabsTrigger>
            <TabsTrigger value="groups" className="whitespace-nowrap">
              Groups
            </TabsTrigger>
            <TabsTrigger value="event-categories" className="whitespace-nowrap">
              Event Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <Suspense fallback={<DepartmentSettingsSkeleton />}>
              <DepartmentSettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="certificates">
            <Suspense fallback={<CertificateSettingsSkeleton />}>
              <CertificateSettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="groups">
            <Suspense fallback={<GroupSettingsSkeleton />}>
              <GroupSettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="event-categories">
            <Suspense fallback={<EventCategorySettingsSkeleton />}>
              <EventCategorySettings />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
