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
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

// Define tab types for type safety
export type MessageTabType = 'quick-message' | 'group-message' | 'birthday-message';

interface MessagingSidebarProps {
  activeTab: MessageTabType;
  setActiveTab: (tab: MessageTabType) => void;
}

function MessagingSidebarComponent({ activeTab, setActiveTab }: MessagingSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Use custom hook for media query instead of manual event listeners
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Close mobile menu when tab changes
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [activeTab, isMobileMenuOpen]);

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useCallback(() => [
    {
      id: "quick-message" as MessageTabType,
      label: "Quick Message",
      mobileLabel: "Quick",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      id: "group-message" as MessageTabType,
      label: "Group Message",
      mobileLabel: "Group",
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: "birthday-message" as MessageTabType,
      label: "Birthday Message",
      mobileLabel: "Birthday",
      icon: <Cake className="h-5 w-5" />,
    },
  ], []);

  const handleTabChange = useCallback((tabId: MessageTabType) => {
    setActiveTab(tabId);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [setActiveTab, isMobile]);

  // Get menu items once
  const items = menuItems();

  return (
    <div className="mb-4 md:mb-0">
      {/* Mobile bottom navigation bar (visible on small screens only) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
        <div className="flex justify-around items-center p-2">
          {items.map((item) => (
            <button
              key={item.id}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
                activeTab === item.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
              onClick={() => handleTabChange(item.id)}
              aria-label={item.label}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.mobileLabel}</span>
            </button>
          ))}
        </div>
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
