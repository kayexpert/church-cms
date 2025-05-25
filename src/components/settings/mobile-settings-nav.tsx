"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Cog,
  Users,
  CreditCard,
  Database,
  MessageSquare,
  Menu
} from "lucide-react";

interface MobileSettingsNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function MobileSettingsNav({ activeTab, setActiveTab }: MobileSettingsNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const menuItems = [
    {
      id: "general",
      label: "General",
      icon: <Cog className="h-4 w-4" />,
    },
    {
      id: "membership",
      label: "Membership",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "finance",
      label: "Finance",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: "messages",
      label: "Messages",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "database",
      label: "Database",
      icon: <Database className="h-4 w-4" />,
    },
  ];

  // Get current tab info
  const currentTab = menuItems.find((item) => item.id === activeTab) || menuItems[0];

  const handleTabChange = (tabId: string) => {
    // Call the parent's setActiveTab function
    setActiveTab(tabId);

    // Update the URL without full page reload
    router.push(`/settings?tab=${tabId}`, { scroll: false });

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
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Select a settings section to navigate to
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={cn(
                  "justify-start h-12 text-base",
                  activeTab === item.id && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleTabChange(item.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "p-1.5 rounded-md",
                    activeTab === item.id ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
