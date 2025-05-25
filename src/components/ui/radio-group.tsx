"use client"

import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  RadioGroupProps
>(({ className, children, value, onValueChange, defaultValue, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "")

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <div
      className={cn("grid gap-2", className)}
      ref={ref}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            selectedValue,
            onSelect: handleValueChange,
          })
        }
        return child
      })}
    </div>
  )
})
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  selectedValue?: string
  onSelect?: (value: string) => void
}

const RadioGroupItem = React.forwardRef<
  HTMLDivElement,
  RadioGroupItemProps
>(({ className, children, value, selectedValue, onSelect, ...props }, ref) => {
  const isSelected = selectedValue === value

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center space-x-2",
        className
      )}
      onClick={() => onSelect?.(value)}
      {...props}
    >
      <div className={cn(
        "flex items-center justify-center w-4 h-4 rounded-full border border-primary",
        isSelected ? "bg-primary" : "bg-background"
      )}>
        {isSelected && (
          <Circle className="h-2 w-2 fill-white text-white" />
        )}
      </div>
      {children}
    </div>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
