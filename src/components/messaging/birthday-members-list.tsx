"use client";

import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Cake, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { calculateAge } from "@/lib/utils";
import { parseDate } from "@/lib/date-utils";
import { Member } from "@/types/member";
import { getMembersByMonth } from "@/services/birthday-message-service";
import { useMediaQuery } from "@/hooks/use-media-query";
import { BirthdayMemberCard } from "@/components/messaging/birthday-member-card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OptimizedMemberImage } from "@/components/members/optimized-member-image";
import { Skeleton } from "@/components/ui/skeleton";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface BirthdayMembersListProps {
  refreshTrigger?: number;
}

function BirthdayMembersListComponent({ refreshTrigger = 0 }: BirthdayMembersListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // Current month by default

  // Check if we're on mobile
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Load members with birthdays in the selected month
  useEffect(() => {
    const loadMembers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getMembersByMonth(selectedMonth + 1); // +1 because months are 0-indexed in JS
        if (error) {
          console.error("Error loading birthday members:", error);
          setMembers([]);
        } else {
          setMembers(data || []);
        }
      } catch (error) {
        console.error("Error in loadMembers:", error);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [selectedMonth, refreshTrigger]);

  // Handle month navigation - memoized to prevent unnecessary re-renders
  const handlePreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1));
  }, []);

  // Filter members by search query - memoized to prevent recalculation on every render
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    });
  }, [members, searchQuery]);

  // Sort members by day of birth - memoized to prevent recalculation on every render
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      if (!a.date_of_birth || !b.date_of_birth) return 0;

      try {
        const dateA = parseDate(a.date_of_birth);
        const dateB = parseDate(b.date_of_birth);

        if (!dateA || !dateB) return 0;

        return dateA.getDate() - dateB.getDate();
      } catch (error) {
        console.error("Error sorting dates:", error);
        return 0;
      }
    });
  }, [filteredMembers]);

  // Format birthday date (e.g., "15-Jan") - memoized to prevent recreation on every render
  const formatBirthdayDate = useCallback((dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = parseDate(dateString);
      if (!date) return "";
      return format(date, "dd-MMM");
    } catch (error) {
      console.error("Error formatting birthday date:", error);
      return "";
    }
  }, []);

  // Get the day of the month from a date string - memoized to prevent recreation on every render
  const getBirthdayDay = useCallback((dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = parseDate(dateString);
      if (!date) return "";
      return format(date, "d");
    } catch (error) {
      console.error("Error getting birthday day:", error);
      return "";
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium min-w-24 text-center">
            {months[selectedMonth]}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members..."
            className="pl-8 w-full sm:w-[250px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        isMobile ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`skeleton-card-${index}`} className="border rounded-md p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-32 col-span-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Birthday</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="animate-pulse">
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted"></div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : sortedMembers.length > 0 ? (
        isMobile ? (
          <div className="space-y-2">
            {sortedMembers.map((member) => {
              const birthdayDay = getBirthdayDay(member.date_of_birth);
              return (
                <BirthdayMemberCard
                  key={member.id}
                  member={member}
                  selectedMonth={selectedMonth}
                  birthdayDay={birthdayDay}
                />
              );
            })}
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Birthday</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMembers.map((member) => {
                  let age = 0;
                  try {
                    age = calculateAge(member.date_of_birth) || 0;
                  } catch (error) {
                    console.error(`Error calculating age for member ${member.id}:`, error);
                  }

                  const birthdayDay = getBirthdayDay(member.date_of_birth);

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <OptimizedMemberImage
                            src={member.profile_image}
                            alt={`${member.first_name} ${member.last_name}`}
                            fallbackText={`${member.first_name[0]}${member.last_name[0]}`}
                            className="h-10 w-10"
                            size={40}
                          />
                          <div>
                            <div className="font-medium">{`${member.first_name} ${member.last_name}`}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Cake className="h-4 w-4 text-primary" />
                          <span>{months[selectedMonth]} {birthdayDay}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span>{age} years</span>
                      </TableCell>
                      <TableCell>
                        <span>{member.primary_phone_number || "No phone number"}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className="text-center py-6 md:py-8 border rounded-md">
          <Cake className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium">No birthdays found</h3>
          <p className="text-sm md:text-base text-muted-foreground px-4">
            No members have birthdays in {months[selectedMonth]}{searchQuery ? " matching your search" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const BirthdayMembersList = memo(BirthdayMembersListComponent);
