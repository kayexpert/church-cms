"use client";

import { CalendarIcon, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { parseDate } from "@/lib/date-utils";

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

export interface AttendanceHistoryProps {
  savedAttendanceRecords: AttendanceRecord[];
  isFetching: boolean;
  onViewRecord: (record: AttendanceRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export function AttendanceHistory({
  savedAttendanceRecords,
  isFetching,
  onViewRecord,
  onDeleteRecord
}: AttendanceHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
        <CardDescription>View past attendance records</CardDescription>
      </CardHeader>
      <CardContent>
        {savedAttendanceRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <CalendarIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No attendance records found</h3>
            <p className="text-muted-foreground mt-1">
              Start recording attendance to see history here.
            </p>
          </div>
        ) : (
          <div className="rounded-md overflow-hidden border">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">DATE</th>
                    <th className="px-4 py-3 text-left font-medium">EVENT</th>
                    <th className="px-4 py-3 text-center font-medium">PRESENT</th>
                    <th className="px-4 py-3 text-center font-medium">ABSENT</th>
                    <th className="px-4 py-3 text-right font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isFetching ? (
                    // Skeleton loader for attendance history
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-4 bg-muted rounded w-24"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-muted rounded w-32"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 bg-muted rounded w-6 mx-auto"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 bg-muted rounded w-6 mx-auto"></div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-8 bg-muted rounded w-16"></div>
                            <div className="h-8 bg-muted rounded w-20"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : savedAttendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    savedAttendanceRecords
                      .sort((a, b) => {
                        const dateA = parseDate(a.date);
                        const dateB = parseDate(b.date);
                        if (!dateA || !dateB) return 0;
                        return dateB.getTime() - dateA.getTime();
                      })
                      .map(record => {
                        const presentCount = record.members?.filter(m => m.present).length || 0;
                        const absentCount = (record.members?.length || 0) - presentCount;

                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              {formatDate(record.date)}
                            </td>
                            <td className="px-4 py-3">
                              {record.eventName}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-green-500 font-medium">{presentCount}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-red-500 font-medium">{absentCount}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewRecord(record);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-100/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRecord(record.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                               
                                </Button>
                              </div>
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
    </Card>
  );
}
