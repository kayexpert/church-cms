"use client";

import { Calendar } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDate } from "@/lib/utils";
import { createDateFromYYYYMMDD } from "@/lib/date-utils";

export interface MemberDatesInfoProps {
  member: {
    membershipDate?: string;
    baptismDate?: string;
  };
  isEditing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MemberDatesInfo({
  member,
  isEditing,
  onInputChange
}: MemberDatesInfoProps) {
  return (
    <div className="bg-muted border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Church Dates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Membership Date</p>
            {isEditing ? (
              <DatePicker
                value={member.membershipDate ? createDateFromYYYYMMDD(member.membershipDate) : null}
                onChange={(date) => {
                  if (!date) {
                    const syntheticEvent = {
                      target: {
                        name: "membershipDate",
                        value: ''
                      }
                    } as React.ChangeEvent<HTMLInputElement>;
                    onInputChange(syntheticEvent);
                    return;
                  }

                  // Create a date string in YYYY-MM-DD format without timezone issues
                  // This ensures the selected date is preserved exactly as shown in the calendar
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const dateString = `${year}-${month}-${day}`;

                  const syntheticEvent = {
                    target: {
                      name: "membershipDate",
                      value: dateString
                    }
                  } as React.ChangeEvent<HTMLInputElement>;
                  onInputChange(syntheticEvent);
                }}
                placeholder="dd-MMM-yy"
                disabledDates={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
              />
            ) : (
              <p className="font-medium">
                {member.membershipDate ? formatDate(member.membershipDate) : 'N/A'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Baptism Date</p>
            {isEditing ? (
              <DatePicker
                value={member.baptismDate ? createDateFromYYYYMMDD(member.baptismDate) : null}
                onChange={(date) => {
                  if (!date) {
                    const syntheticEvent = {
                      target: {
                        name: "baptismDate",
                        value: ''
                      }
                    } as React.ChangeEvent<HTMLInputElement>;
                    onInputChange(syntheticEvent);
                    return;
                  }

                  // Create a date string in YYYY-MM-DD format without timezone issues
                  // This ensures the selected date is preserved exactly as shown in the calendar
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const dateString = `${year}-${month}-${day}`;

                  const syntheticEvent = {
                    target: {
                      name: "baptismDate",
                      value: dateString
                    }
                  } as React.ChangeEvent<HTMLInputElement>;
                  onInputChange(syntheticEvent);
                }}
                placeholder="dd-MMM-yy"
                disabledDates={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
              />
            ) : (
              <p className="font-medium">
                {member.baptismDate ? formatDate(member.baptismDate) : 'N/A'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
