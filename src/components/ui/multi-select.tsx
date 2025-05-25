"use client";

import * as React from "react";
import { X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUnselect = (option: string) => {
    onChange(selected.filter((s) => s !== option));
  };

  const handleSelect = (option: string) => {
    if (!selected.includes(option)) {
      onChange([...selected, option]);
    }
    setSearchValue("");
  };

  const filteredOptions = options.filter(
    (option) =>
      !selected.includes(option.value) &&
      option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          open && "ring-2 ring-ring ring-offset-2"
        )}
        onClick={() => setOpen(true)}
      >
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selected.map((selectedValue) => {
              const option = options.find((o) => o.value === selectedValue);
              return (
                <Badge
                  key={selectedValue}
                  variant="secondary"
                  className="rounded-sm px-1 py-0 font-normal"
                >
                  {option?.label || selectedValue}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(selectedValue);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <div className="ml-auto flex items-center">
          <input
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder=""
          />
          {open ? (
            <ChevronUp className="h-4 w-4 opacity-50" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-50" />
          )}
        </div>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-input bg-popover shadow-md animate-in fade-in-80">
          <div className="max-h-[200px] overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
