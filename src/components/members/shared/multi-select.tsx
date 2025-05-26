"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  name: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  variant?: "primary" | "success";
}

export function MultiSelect({
  options,
  selected = [],
  onChange,
  placeholder = "Select options...",
  variant = "primary"
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Ensure selected is always an array
  const safeSelected = Array.isArray(selected) ? selected : [];

  const toggleOption = (id: string) => {
    if (safeSelected.includes(id)) {
      onChange(safeSelected.filter(v => v !== id));
    } else {
      onChange([...safeSelected, id]);
    }
  };

  const getBadgeStyles = () => {
    return variant === "primary"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-green-500/10 text-green-500 border-green-500/20";
  };

  return (
    <div className="relative">
      <div
        className="w-full flex flex-wrap items-center rounded-md border border-input dark:bg-input/30 dark:hover:bg-input/50 px-3 py-2 text-sm ring-offset-background cursor-pointer gap-1 min-h-[2.25rem] shadow-xs outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {safeSelected.length > 0 ? (
          <>
            {options
              .filter(opt => safeSelected.includes(opt.id))
              .map(opt => (
                <Badge
                  key={opt.id}
                  variant="outline"
                  className={`${getBadgeStyles()} text-xs px-2 py-0.5 h-6 flex items-center max-w-full truncate`}
                >
                  <span className="truncate">{opt.name}</span>
                </Badge>
              ))}
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <div className="ml-auto flex-shrink-0 self-start mt-0.5">
          <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          <div className="p-1 space-y-1">
            {options.map(option => (
              <div
                key={option.id}
                className={`flex items-center px-2 py-1.5 rounded-sm text-sm cursor-pointer ${
                  safeSelected.includes(option.id)
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => toggleOption(option.id)}
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                  {safeSelected.includes(option.id) && <Check className="h-3 w-3" />}
                </div>
                <span className="truncate">{option.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
