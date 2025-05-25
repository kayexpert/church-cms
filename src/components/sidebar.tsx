"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  Home,
  Settings,
  Users,
  Briefcase,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Members",
      href: "/members",
      icon: Users,
    },
    {
      title: "Finance",
      href: "/finance",
      icon: CreditCard,
    },
    {
      title: "Asset Management",
      href: "/asset-management",
      icon: Briefcase,
    },
    {
      title: "Events",
      href: "/events",
      icon: Calendar,
    },
    {
      title: "Messaging",
      href: "/messaging",
      icon: MessageSquare,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen border-r bg-card w-64",
        className
      )}
    >
      <div className="flex items-center h-16 px-5 border-b">
        <Link href="/dashboard" className="flex items-center">
          <span className="text-xl font-bold tracking-tight">Church MS</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-6">
        <nav className="grid gap-3 px-3">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-4 text-base font-medium transition-all",
                pathname === item.href
                  ? "bg-primary/10 text-primary border-l-4 border-primary"
                  : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-4 text-sm text-center  border-t">
        <span>Church MS v1.0.0</span>
      </div>
    </div>
  );
}
