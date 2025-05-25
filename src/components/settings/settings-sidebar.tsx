"use client";

import {
  Cog,
  Users,
  CreditCard,
  Database,
  MessageSquare
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface SettingsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function SettingsSidebar({ activeTab, setActiveTab }: SettingsSidebarProps) {
  const menuItems = [
    {
      id: "general",
      label: "General",
      icon: <Cog className="h-5 w-5" />,
    },
    {
      id: "membership",
      label: "Membership",
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: "finance",
      label: "Finance",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      id: "messages",
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      id: "database",
      label: "Database",
      icon: <Database className="h-5 w-5" />,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">Settings</h3>
      </div>
      <div className="p-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`w-full text-left p-3 my-1 rounded-lg transition-colors flex items-center ${
              activeTab === item.id
                ? "bg-primary/10 text-primary border-l-4 border-primary"
                : "text-foreground hover:bg-primary/5 hover:text-primary"
            }`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
