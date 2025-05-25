"use client";

import { memo } from "react";
import { Cake } from "lucide-react";
import { Member } from "@/types/member";
import { calculateAge } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedMemberImage } from "@/components/members/optimized-member-image";

interface BirthdayMemberCardProps {
  member: Member;
  selectedMonth: number;
  birthdayDay: string;
}

function BirthdayMemberCardComponent({ member, selectedMonth, birthdayDay }: BirthdayMemberCardProps) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  let age = 0;
  try {
    age = calculateAge(member.date_of_birth) || 0;
  } catch (error) {
    console.error(`Error calculating age for member ${member.id}:`, error);
  }

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <OptimizedMemberImage
            src={member.profile_image}
            alt={`${member.first_name} ${member.last_name}`}
            fallbackText={`${member.first_name[0]}${member.last_name[0]}`}
            className="h-12 w-12 flex-shrink-0"
            size={48}
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">
              {`${member.first_name} ${member.last_name}`}
            </h3>
            
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <p className="text-muted-foreground">Birthday</p>
                <div className="flex items-center gap-1">
                  <Cake className="h-3 w-3 text-primary" />
                  <span>{months[selectedMonth]} {birthdayDay}</span>
                </div>
              </div>
              
              <div>
                <p className="text-muted-foreground">Age</p>
                <p>{age} years</p>
              </div>
              
              <div className="col-span-2">
                <p className="text-muted-foreground">Contact</p>
                <p className="truncate">{member.primary_phone_number || "No phone number"}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const BirthdayMemberCard = memo(BirthdayMemberCardComponent);
