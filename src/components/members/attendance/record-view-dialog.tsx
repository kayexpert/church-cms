"use client";

import { Check, X, CalendarIcon, Edit, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedMemberImage } from "@/components/members/optimized-member-image";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { parseDate } from "@/lib/date-utils";

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

export interface RecordViewDialogProps {
  selectedRecord: AttendanceRecord | null;
  isEditingRecord: boolean;
  editedMemberIds: string[];
  members: Member[];
  onCloseRecordView: () => void;
  onEditRecord: () => void;
  onToggleEditAttendance: (memberId: string) => void;
  onSaveEditedRecord: () => void;
  onDeleteRecord: (id: string) => void;
}

export function RecordViewDialog({
  selectedRecord,
  isEditingRecord,
  editedMemberIds,
  members,
  onCloseRecordView,
  onEditRecord,
  onToggleEditAttendance,
  onSaveEditedRecord,
  onDeleteRecord
}: RecordViewDialogProps) {
  if (!selectedRecord) return null;

  return (
    <Dialog open={selectedRecord !== null} onOpenChange={onCloseRecordView}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Attendance Record</DialogTitle>
              <DialogDescription>
                {formatDate(selectedRecord.date)} - {selectedRecord.eventName}
              </DialogDescription>
            </div>
            {!isEditingRecord && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditRecord}
                >
                  <Edit className="h-4 w-4 mr-1 text-green-600" />
                  <span className="text-green-600">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteRecord(selectedRecord.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1 text-red-600" />
                  <span className="text-red-600">Delete</span>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isEditingRecord && (
          <Alert className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Editing Mode</AlertTitle>
            <AlertDescription>
              You are editing this attendance record. Click Save to update the record.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-background border">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="mb-3 bg-blue-500/20 p-3 rounded-full">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{selectedRecord.members?.length || 0}</h3>
                <p className="text-sm text-muted-foreground">Total members</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-background border">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="mb-3 bg-green-500/20 p-3 rounded-full">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">
                  {isEditingRecord
                    ? editedMemberIds.length
                    : selectedRecord.members?.filter(m => m.present).length || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-background border">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="mb-3 bg-red-500/20 p-3 rounded-full">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">
                  {isEditingRecord
                    ? (selectedRecord.members?.length || 0) - editedMemberIds.length
                    : (selectedRecord.members?.length || 0) - (selectedRecord.members?.filter(m => m.present).length || 0)}
                </h3>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-12">ID</th>
                  <th className="px-4 py-3 text-left font-medium">NAME</th>
                  <th className="px-4 py-3 text-center font-medium">STATUS</th>
                  {isEditingRecord && (
                    <th className="px-4 py-3 text-right font-medium">ACTION</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedRecord.members?.map(member => {
                  const memberData = members.find(m => m.id === member.memberId);
                  if (!memberData) return null;

                  const initials = `${memberData.first_name[0]}${memberData.last_name[0]}`;
                  const isPresent = isEditingRecord
                    ? editedMemberIds.includes(member.memberId)
                    : member.present;

                  return (
                    <tr
                      key={member.memberId}
                      className={cn(
                        "transition-colors",
                        isPresent ? "bg-primary/5" : "hover:bg-muted/20"
                      )}
                    >
                      <td className="px-4 py-3">
                        <OptimizedMemberImage
                          src={memberData.profile_image}
                          alt={`${memberData.first_name} ${memberData.last_name}`}
                          fallbackText={initials}
                          className="h-8 w-8"
                          size={32}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {`${memberData.first_name} ${memberData.last_name}`}
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
                      {isEditingRecord && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onToggleEditAttendance(member.memberId)}
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
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          {isEditingRecord ? (
            <>
              <Button variant="outline" onClick={() => onCloseRecordView()}>
                Cancel
              </Button>
              <Button onClick={onSaveEditedRecord}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save mr-1">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onCloseRecordView}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
