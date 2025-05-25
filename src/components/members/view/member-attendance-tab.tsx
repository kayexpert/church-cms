"use client";

import { useState } from "react";
import { formatDate, formatDateLong } from "@/lib/utils";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AttendanceRecord {
  id: string;
  date: string;
  event_type: string;
  event_name?: string;
  members: {
    member_id: string;
    present: boolean;
    notes?: string;
  }[];
  created_at?: string;
  updated_at?: string;
}

export interface MemberAttendanceTabProps {
  memberId: string;
  attendanceRecords: AttendanceRecord[];
  isLoading: boolean;
}

export function MemberAttendanceTab({
  memberId,
  attendanceRecords,
  isLoading
}: MemberAttendanceTabProps) {
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent">("all");

  // Filter attendance records based on search and filter
  const filteredAttendanceRecords = attendanceRecords
    .filter(record => {
      // Filter by search query
      if (attendanceSearch) {
        const searchLower = attendanceSearch.toLowerCase();
        const eventName = record.event_name?.toLowerCase() || '';
        const date = formatDate(record.date).toLowerCase();

        if (!eventName.includes(searchLower) && !date.includes(searchLower)) {
          return false;
        }
      }

      // Filter by attendance status
      if (attendanceFilter !== "all") {
        const memberAttendance = record.members.find(m => m.member_id === memberId);
        if (!memberAttendance) return false;

        if (attendanceFilter === "present" && !memberAttendance.present) {
          return false;
        }
        if (attendanceFilter === "absent" && memberAttendance.present) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-semibold">Attendance History</h3>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search events..."
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
            className="w-full sm:w-[200px]"
          />
          <Select
            value={attendanceFilter}
            onValueChange={(value) => setAttendanceFilter(value as "all" | "present" | "absent")}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="present">Present Only</SelectItem>
              <SelectItem value="absent">Absent Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full justify-between">
            <div className="h-6 w-40 bg-muted rounded"></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="h-9 w-full sm:w-[200px] bg-muted rounded"></div>
              <div className="h-9 w-full sm:w-[150px] bg-muted rounded"></div>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 p-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-6 w-20 bg-muted rounded"></div>
                <div className="h-6 w-20 bg-muted rounded"></div>
                <div className="h-6 w-20 bg-muted rounded"></div>
              </div>
            </div>
            <div className="divide-y">
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="p-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-6 w-24 bg-muted rounded"></div>
                    <div className="h-6 w-32 bg-muted rounded"></div>
                    <div className="h-6 w-16 bg-muted rounded mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filteredAttendanceRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            {attendanceSearch || attendanceFilter !== "all" ? (
              <Filter className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Search className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <h3 className="font-semibold text-lg">No attendance records found</h3>
          <p className="text-muted-foreground mt-1">
            {attendanceSearch || attendanceFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "This member has no attendance records yet."}
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">DATE</th>
                  <th className="px-4 py-3 text-left font-medium">EVENT</th>
                  <th className="px-4 py-3 text-center font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAttendanceRecords.map(record => {
                  const memberAttendance = record.members.find(m => m.member_id === memberId);
                  const isPresent = memberAttendance?.present || false;

                  return (
                    <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {formatDateLong(record.date)}
                      </td>
                      <td className="px-4 py-3">
                        {record.event_name || record.event_type}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isPresent
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}>
                          {isPresent ? "Present" : "Absent"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
