"use client";

import { useState, useEffect, memo, useCallback } from "react";
import {
  MessageSquare,
  Users,
  Cake,
  Menu,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { useMediaQuery } from "@/hooks/use-media-query";

// Define tab types for type safety
export type MessageTabType = 'quick-message' | 'group-message' | 'birthday-message';

interface MessagingSidebarProps {
  activeTab: MessageTabType;
  setActiveTab: (tab: MessageTabType) => void;
}

function MessagingSidebarComponent({ activeTab, setActiveTab }: MessagingSidebarProps) {
  const [open, setOpen] = useState(false);

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useCallback(() => [
    {
      id: "quick-message" as MessageTabType,
      label: "Quick Message",
      shortLabel: "Quick",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "group-message" as MessageTabType,
      label: "Group Message",
      shortLabel: "Group",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "birthday-message" as MessageTabType,
      label: "Birthday Message",
      shortLabel: "Birthday",
      icon: <Cake className="h-4 w-4" />,
    },
  ], []);

  const handleTabChange = useCallback((tabId: MessageTabType) => {
    setActiveTab(tabId);
    setOpen(false);
  }, [setActiveTab]);

  // Get menu items once
  const items = menuItems();

  // Get current tab info
  const currentTab = items.find((item) => item.id === activeTab) || items[0];

  return (
    <div className="mb-4 md:mb-0">
      {/* Mobile Navigation (short button style like members page) */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center justify-between w-auto px-3 py-2 h-auto shadow-sm hover:shadow-md transition-shadow"
              aria-label={`Current section: ${currentTab.label}. Tap to change section.`}
            >
              <div className="flex items-center gap-2">
                {currentTab.icon}
                <span className="font-medium">{currentTab.shortLabel}</span>
              </div>
              <Menu className="h-4 w-4 text-muted-foreground ml-2" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-[70vh] rounded-t-xl max-h-[90vh] overflow-y-auto pb-safe"
          >
            <SheetHeader className="mb-4 sticky top-0 bg-background pt-2 pb-2 z-10">
              <SheetTitle>Messaging</SheetTitle>
              <SheetDescription>
                Select a messaging section to navigate to
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-2">
              {items.map((item) => (
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

      {/* Desktop sidebar (hidden on small screens) */}
      <Card className="overflow-hidden hidden md:block">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Messaging</h3>
        </div>
        <div className="p-2">
          {items.map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full text-left p-3 my-1 rounded-lg transition-colors flex items-center",
                activeTab === item.id
                  ? "bg-primary/10 text-primary border-l-4 border-primary"
                  : "text-foreground hover:bg-primary/5 hover:text-primary"
              )}
              onClick={() => handleTabChange(item.id)}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const MessagingSidebar = memo(MessagingSidebarComponent);
