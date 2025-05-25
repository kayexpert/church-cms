"use client";

import { Calendar, MapPin, Clock, User, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { EventWithCategory } from "@/services/event-service";

interface ViewEventDialogProps {
  event: EventWithCategory;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ViewEventDialog({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ViewEventDialogProps) {
  // Function to get status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "ongoing":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={getStatusColor(event.status)}
            >
              {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : "Unknown"}
            </Badge>
            {event.category && (
              <Badge 
                variant="outline" 
                style={{ 
                  backgroundColor: `${event.category.color}20`,
                  color: event.category.color,
                  borderColor: event.category.color
                }}
              >
                {event.category.name}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl mt-2">{event.title}</DialogTitle>
          <DialogDescription>
            {event.description || "No description provided"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Date & Time</div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div>
                    {formatDate(event.date)}
                    {event.end_date && event.end_date !== event.date && ` - ${formatDate(event.end_date)}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.is_all_day ? "All day" : (event.start_time || event.end_time) ? `${event.start_time || "?"} - ${event.end_time || "?"}` : "No time specified"}
                  </div>
                </div>
              </div>
            </div>

            {event.location && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Location</div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              </div>
            )}

            {event.organizer && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Organizer</div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{event.organizer}</span>
                </div>
              </div>
            )}

            {event.recurrence && event.recurrence !== "none" && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recurrence</div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{event.recurrence.charAt(0).toUpperCase() + event.recurrence.slice(1)}</span>
                </div>
              </div>
            )}
          </div>

          {event.department && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Department</div>
                <div>{event.department.name}</div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={onEdit}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
