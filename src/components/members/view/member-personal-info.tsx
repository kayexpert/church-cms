"use client";

import { Calendar, Briefcase, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDate } from "@/lib/utils";
import { createDateFromYYYYMMDD } from "@/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MemberPersonalInfoProps {
  member: {
    dateOfBirth?: string;
    occupation?: string;
    maritalStatus?: string;
    spouseName?: string;
    numberOfChildren?: string;
  };
  isEditing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export function MemberPersonalInfo({
  member,
  isEditing,
  onInputChange,
  onSelectChange
}: MemberPersonalInfoProps) {

  return (
    <div className="bg-muted border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            {isEditing ? (
              <DatePicker
                value={member.dateOfBirth ? createDateFromYYYYMMDD(member.dateOfBirth) : null}
                onChange={(date) => {
                  if (!date) {
                    const syntheticEvent = {
                      target: {
                        name: "dateOfBirth",
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
                      name: "dateOfBirth",
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
                {member.dateOfBirth ? formatDate(member.dateOfBirth) : 'N/A'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Occupation</p>
            {isEditing ? (
              <Input
                type="text"
                name="occupation"
                value={member.occupation || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.occupation || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Marital Status</p>
            {isEditing ? (
              <Select
                value={member.maritalStatus || undefined}
                onValueChange={(value) => onSelectChange('maritalStatus', value)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-medium capitalize">{member.maritalStatus || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Spouse Name</p>
            {isEditing ? (
              <Input
                type="text"
                name="spouseName"
                value={member.spouseName || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.spouseName || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Number of Children</p>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                name="numberOfChildren"
                value={member.numberOfChildren || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.numberOfChildren || '0'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
