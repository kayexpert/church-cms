"use client";

import { Check, X, CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface AttendanceStatsProps {
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  absenceRate: number;
}

export function AttendanceStats({
  totalMembers,
  presentCount,
  absentCount,
  attendanceRate,
  absenceRate
}: AttendanceStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Members */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-background border">
        <CardContent className="p-4 flex items-center">
          <div className="mr-4 bg-blue-500/20 p-3 rounded-full">
            <CalendarIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">{totalMembers}</h3>
            <p className="text-sm text-muted-foreground">Active members</p>
          </div>
        </CardContent>
      </Card>

      {/* Present */}
      <Card className="bg-gradient-to-br from-green-500/10 to-background border">
        <CardContent className="p-4 flex items-center">
          <div className="mr-4 bg-green-500/20 p-3 rounded-full">
            <Check className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">{presentCount}</h3>
            <p className="text-sm text-muted-foreground">{attendanceRate}% attendance rate</p>
          </div>
        </CardContent>
      </Card>

      {/* Absent */}
      <Card className="bg-gradient-to-br from-red-500/10 to-background border">
        <CardContent className="p-4 flex items-center">
          <div className="mr-4 bg-red-500/20 p-3 rounded-full">
            <X className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">{absentCount}</h3>
            <p className="text-sm text-muted-foreground">{absenceRate}% absence rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
