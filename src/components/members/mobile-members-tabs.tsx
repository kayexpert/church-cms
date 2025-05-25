"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCircle2,
  Calendar,
  Cake,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileMembersTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileMembersTabs({ activeTab, onTabChange }: MobileMembersTabsProps) {
  const [open, setOpen] = useState(false);

  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "members",
      label: "Members",
      icon: <UserCircle2 className="h-4 w-4" />,
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      id: "birthdays",
      label: "Birthdays",
      icon: <Cake className="h-4 w-4" />,
    },
  ];

  // Get current tab info
  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const router = useRouter();

  const handleTabChange = (tabId: string) => {
    // Call the parent's onTabChange function
    onTabChange(tabId);

    // Update the URL without full page reload, add timestamp to force refresh
    router.push(`/members?tab=${tabId}&t=${Date.now()}`, { scroll: false });

    // Close the mobile sheet
    setOpen(false);
  };

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between w-full shadow-sm hover:shadow-md transition-shadow"
            aria-label={`Current section: ${currentTab.label}. Tap to change section.`}
          >
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 p-1.5 rounded-md">
                {currentTab.icon}
              </span>
              <span className="font-medium">{currentTab.label}</span>
            </div>
            <Menu className="h-4 w-4 text-muted-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-[70vh] rounded-t-xl max-h-[90vh] overflow-y-auto pb-safe"
        >
          <SheetHeader className="mb-4 sticky top-0 bg-background pt-2 pb-2 z-10">
            <SheetTitle>Members Sections</SheetTitle>
            <SheetDescription>
              Select a section to navigate to
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={cn(
                  "justify-start h-12 text-base",
                  activeTab === tab.id && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleTabChange(tab.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "p-1.5 rounded-md",
                    activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
