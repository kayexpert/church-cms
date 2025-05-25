import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Import date utilities from our new module
import {
  formatDate as formatDateUtil,
  formatDateLong as formatDateLongUtil,
  calculateAge as calculateAgeUtil,
  formatBirthdayDate as formatBirthdayDateUtil
} from "@/lib/date-utils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Makes an element clickable by adding the 'clickable' class and appropriate attributes
 * @param onClick The click handler function
 * @param isClickable Whether the element should be clickable (defaults to true if onClick is provided)
 * @returns An object with className and props to spread onto an element
 */
export function makeClickable(onClick?: () => void, isClickable?: boolean) {
  const clickable = isClickable ?? !!onClick;

  return {
    className: clickable ? 'clickable' : '',
    onClick,
    role: onClick ? 'button' : undefined,
    tabIndex: onClick ? 0 : undefined,
    'aria-disabled': onClick ? undefined : true,
  };
}

// Re-export date utilities for backward compatibility
export const formatDate = formatDateUtil;
export const formatDateLong = formatDateLongUtil;
export const calculateAge = calculateAgeUtil;
export const formatBirthdayDate = formatBirthdayDateUtil;
