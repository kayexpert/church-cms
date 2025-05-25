"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, CaptionProps } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Custom caption component with year and month selectors
 */
function CustomCaption({
  displayMonth,
  currYear,
  currMonth,
  onMonthChange,
  onYearChange
}: CaptionProps & {
  currYear: number,
  currMonth: number,
  onMonthChange: (month: number) => void,
  onYearChange: (year: number) => void
}) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate a range of years (50 years before and after current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  return (
    <div className="flex justify-center items-center gap-1 py-1">
      <Select value={currMonth.toString()} onValueChange={(value) => onMonthChange(parseInt(value))}>
        <SelectTrigger className="h-8 w-[110px]">
          <SelectValue>{months[currMonth]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={month} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
        <SelectTrigger className="h-8 w-[100px]">
          <SelectValue>{currYear}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  // Track the current month and year for the selectors
  const [currMonth, setCurrMonth] = React.useState<Date>(props.defaultMonth || new Date());

  // Handle month change from the month selector
  const handleMonthChange = (monthIndex: number) => {
    const newDate = new Date(currMonth);
    newDate.setMonth(monthIndex);
    setCurrMonth(newDate);
    props.onMonthChange?.(newDate);
  };

  // Handle year change from the year selector
  const handleYearChange = (year: number) => {
    const newDate = new Date(currMonth);
    newDate.setFullYear(year);
    setCurrMonth(newDate);
    props.onMonthChange?.(newDate);
  };

  // Update currMonth when month changes from navigation
  React.useEffect(() => {
    if (props.month) {
      setCurrMonth(props.month);
    }
  }, [props.month]);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      month={currMonth}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-x-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
        Caption: ({ displayMonth }) => (
          <CustomCaption
            displayMonth={displayMonth}
            currYear={currMonth.getFullYear()}
            currMonth={currMonth.getMonth()}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
          />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
