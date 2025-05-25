/**
 * Utility functions for events
 */

/**
 * Format time string to 12-hour format with AM/PM
 * @param time Time string in 24-hour format (HH:MM)
 * @returns Formatted time string in 12-hour format
 */
export function formatEventTime(time?: string): string {
  if (!time) return "";

  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time; // Return original time if parsing fails
  }
}

/**
 * Get color for event based on category or default color
 * @param event Event with optional category
 * @returns Object with background and text colors
 */
export function getEventColor(event: { category?: { color?: string }, color?: string }) {
  if (event.category?.color) {
    return {
      bg: `${event.category.color}20`,
      text: event.category.color
    };
  }

  if (event.color) {
    return {
      bg: `${event.color}20`,
      text: event.color
    };
  }

  // Default color
  return {
    bg: "#4CAF5020",
    text: "#4CAF50"
  };
}

/**
 * Get status badge variant based on event status
 * @param status Event status
 * @returns Badge variant name
 */
export function getStatusBadgeVariant(status?: string): "default" | "success" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "upcoming":
      return "default";
    case "ongoing":
      return "success";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}
