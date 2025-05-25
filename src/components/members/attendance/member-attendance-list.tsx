"use client";

import { Check, X, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OptimizedMemberImage } from "@/components/members/optimized-member-image";
import { cn } from "@/lib/utils";
import { formatEventType } from "@/services/attendance-service";
import { formatDate } from "@/lib/utils";

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
  status: 'active' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  date: string;
  eventType: string;
  eventName?: string;
  members: {
    memberId: string;
    present: boolean;
    notes?: string;
  }[];
  createdAt?: string;
}

export interface MemberAttendanceListProps {
  filteredMembers: Member[];
  presentMemberIds: string[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleAttendance: (memberId: string) => void;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
  onSaveAttendance: () => void;
  existingRecord: AttendanceRecord | null;
  isLoading: boolean;
  isFetching: boolean;
  selectedDate: string;
  selectedEvent: string;
}

export function MemberAttendanceList({
  filteredMembers,
  presentMemberIds,
  searchQuery,
  onSearchChange,
  onToggleAttendance,
  onMarkAllPresent,
  onMarkAllAbsent,
  onSaveAttendance,
  existingRecord,
  isLoading,
  isFetching,
  selectedDate,
  selectedEvent
}: MemberAttendanceListProps) {
  const totalMembers = filteredMembers.length;
  const presentCount = presentMemberIds.length;

  return (
    <>
      {existingRecord && (
        <Alert className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Editing Existing Record</AlertTitle>
          <AlertDescription>
            You are editing an existing attendance record for {formatDate(selectedDate)} - {formatEventType(selectedEvent)}.
            Saving will update the existing record.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Member Attendance</CardTitle>
              <CardDescription>
                {presentCount} of {totalMembers} members present
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:items-center">
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full sm:w-[200px]"
              />
              <div className="flex flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={onMarkAllPresent} className="flex-1 sm:flex-initial">
                  <Check className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline sm:inline">Mark All</span> Present
                </Button>
                <Button variant="outline" size="sm" onClick={onMarkAllAbsent} className="flex-1 sm:flex-initial">
                  <X className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline sm:inline">Mark All</span> Absent
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No members found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium w-12">ID</th>
                      <th className="px-4 py-3 text-left font-medium">NAME</th>
                      <th className="px-4 py-3 text-center font-medium">STATUS</th>
                      <th className="px-4 py-3 text-right font-medium">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isFetching ? (
                      // Skeleton loader for member attendance
                      Array.from({ length: 8 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="animate-pulse">
                          <td className="px-4 py-3">
                            <div className="h-8 w-8 bg-muted rounded-full"></div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-muted rounded w-32"></div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="h-6 bg-muted rounded-full w-16 mx-auto"></div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="h-8 w-8 bg-muted rounded-full ml-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No members found
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map(member => {
                        const isPresent = presentMemberIds.includes(member.id);
                        const initials = `${member.first_name[0]}${member.last_name[0]}`;

                        return (
                          <tr
                            key={member.id}
                            className={cn(
                              "transition-colors",
                              isPresent ? "bg-primary/5" : "hover:bg-muted/20"
                            )}
                          >
                            <td className="px-4 py-3">
                              <OptimizedMemberImage
                                src={member.profile_image}
                                alt={`${member.first_name} ${member.last_name}`}
                                fallbackText={initials}
                                className="h-8 w-8"
                                size={32}
                              />
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {`${member.first_name} ${member.last_name}`}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                isPresent
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-red-500/10 text-red-500"
                              )}>
                                {isPresent ? "Present" : "Absent"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => onToggleAttendance(member.id)}
                                className={cn(
                                  "rounded-full p-2 transition-colors",
                                  isPresent
                                    ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="ml-auto" onClick={onSaveAttendance} disabled={isLoading || isFetching}>
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save mr-2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                {existingRecord ? "Save Changes" : "Record Attendance"}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
