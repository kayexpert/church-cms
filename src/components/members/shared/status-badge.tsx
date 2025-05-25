"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status: 'active' | 'inactive';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({
  status,
  className = "",
  size = 'md'
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };

  return (
    <Badge
      variant={status === "active" ? "default" : "secondary"}
      className={cn(
        status === "active"
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-red-600 hover:bg-red-700 text-white",
        sizeClasses[size],
        className
      )}
    >
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
}
