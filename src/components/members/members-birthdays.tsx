"use client";

import { useState, useEffect, useMemo } from "react";
import { differenceInYears } from "date-fns";
import { Cake, ChevronLeft, ChevronRight, Mail, Phone, Search, TrendingUp } from "lucide-react";
import { formatDate, formatBirthdayDate, calculateAge } from "@/lib/utils";
import { parseDate } from "@/lib/date-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OptimizedMemberImage } from "./optimized-member-image";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getMembers } from "@/services/member-service";
import { toast } from "sonner";

// Define the Member type for this component
interface Member {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  profile_image?: string;
  email?: string;
  primary_phone_number?: string;
  departments?: string[];
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MembersBirthdays() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // State for birthday stats
  const [birthdayStats, setBirthdayStats] = useState<number[]>(Array(12).fill(0));

  // Fetch members on component mount
  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getMembers();
        if (error) {
          console.error("Error fetching members:", error);
          toast.error("Failed to load members");
        } else if (data && data.data) {
          // Extract the members array from the paginated response
          setMembers(data.data);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
        toast.error("Failed to load members");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // Filter members with birthdays
  const membersWithBirthdays = useMemo(() => {
    return members.filter(member => member.date_of_birth);
  }, [members]);

  // Calculate birthdays by month
  useEffect(() => {
    if (membersWithBirthdays.length > 0) {
      const counts = Array(12).fill(0);

      membersWithBirthdays.forEach(member => {
        if (member.date_of_birth) {
          const birthDate = parseDate(member.date_of_birth);
          if (birthDate) {
            counts[birthDate.getMonth()]++;
          }
        }
      });

      setBirthdayStats(counts);
    }
  }, [membersWithBirthdays]);

  // Filter members by selected month and search query
  const filteredBirthdays = useMemo(() => {
    return membersWithBirthdays
      .filter(member => {
        if (!member.date_of_birth) return false;

        // Filter by month
        const birthDate = parseDate(member.date_of_birth);
        if (!birthDate) return false;

        const matchesMonth = birthDate.getMonth() === selectedMonth;

        // Filter by search query
        if (searchQuery) {
          const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
          return matchesMonth && fullName.includes(searchQuery.toLowerCase());
        }

        return matchesMonth;
      })
      .sort((a, b) => {
        if (!a.date_of_birth || !b.date_of_birth) return 0;

        const dateA = parseDate(a.date_of_birth);
        const dateB = parseDate(b.date_of_birth);

        if (!dateA || !dateB) return 0;
        return dateA.getDate() - dateB.getDate();
      });
  }, [membersWithBirthdays, selectedMonth, searchQuery]);

  // Handle month navigation
  const handlePreviousMonth = () => {
    setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1));
  };

  // Calculate upcoming birthdays (next 7 days)
  const upcomingBirthdays = useMemo(() => {
    return membersWithBirthdays
      .filter(member => {
        if (!member.date_of_birth) return false;

        const birthDate = parseDate(member.date_of_birth);
        if (!birthDate) return false;

        const nextBirthday = new Date(currentDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        // If the birthday has already occurred this year, set it to next year
        if (nextBirthday < currentDate) {
          nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
        }

        // Calculate the difference in days
        const diffTime = nextBirthday.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Return true if the birthday is within the next 7 days
        return diffDays >= 0 && diffDays <= 7;
      })
      .sort((a, b) => {
        if (!a.date_of_birth || !b.date_of_birth) return 0;

        const dateA = parseDate(a.date_of_birth);
        const dateB = parseDate(b.date_of_birth);

        if (!dateA || !dateB) return 0;

        const nextBirthdayA = new Date(currentDate.getFullYear(), dateA.getMonth(), dateA.getDate());
        const nextBirthdayB = new Date(currentDate.getFullYear(), dateB.getMonth(), dateB.getDate());

        if (nextBirthdayA < currentDate) nextBirthdayA.setFullYear(nextBirthdayA.getFullYear() + 1);
        if (nextBirthdayB < currentDate) nextBirthdayB.setFullYear(nextBirthdayB.getFullYear() + 1);

        return nextBirthdayA.getTime() - nextBirthdayB.getTime();
      });
  }, [membersWithBirthdays, currentDate]);

  // Get the countdown of days until birthday
  const getDayCountdown = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return '';

    const today = new Date();
    const birthDate = parseDate(dateOfBirth);
    if (!birthDate) return '';

    const birthThisYear = new Date(birthDate);
    birthThisYear.setFullYear(today.getFullYear());

    if (birthThisYear < today) {
      // Birthday already passed this year, check for next year
      birthThisYear.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = birthThisYear.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow!';
    return `In ${diffDays} days`;
  };

  // Find the month with the most birthdays for scaling
  const maxBirthdayCount = Math.max(...birthdayStats);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Birthdays Card */}
        <Card className="border lg:col-span-2">
          <CardHeader className="flex border-b border-border/50 pb-4">
            <CardTitle className="flex items-center">
              <Cake className="h-5 w-5 mr-2 text-primary" /> Upcoming Birthdays (Next 7 Days)
            </CardTitle>
          </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="flex items-center p-4 bg-card rounded-lg border border-border">
                  <div className="h-12 w-12 rounded-full bg-muted mr-4"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                    <div className="h-3 w-24 bg-muted rounded"></div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="h-8 w-8 rounded-full bg-muted"></div>
                    <div className="h-8 w-8 rounded-full bg-muted"></div>
                  </div>
                  <div className="ml-4 h-6 w-16 bg-muted rounded-full"></div>
                </div>
              ))}
            </div>
          ) : upcomingBirthdays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative border rounded-full p-6 mb-4">
                <Cake className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Upcoming Birthdays</h3>
              <p className="text-muted-foreground max-w-md">
                There are no birthdays coming up in the next 7 days.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-1">
              {upcomingBirthdays.map(member => {
                if (!member.date_of_birth) return null;

                const birthDate = parseDate(member.date_of_birth);
                if (!birthDate) return null;
                const age = calculateAge(member.date_of_birth) || 0;
                const nextBirthday = new Date(currentDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                if (nextBirthday < currentDate) {
                  nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
                }

                // Calculate days until birthday
                const diffTime = nextBirthday.getTime() - currentDate.getTime();
                const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={member.id}
                    className="flex items-center p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                      <OptimizedMemberImage
                        src={member.profile_image}
                        alt={`${member.first_name} ${member.last_name}`}
                        fallbackText={`${member.first_name[0]}${member.last_name[0]}`}
                        className="h-12 w-12"
                        size={48}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {member.first_name} {member.last_name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {months[birthDate.getMonth()]} {birthDate.getDate()} (Turns {age + 1})
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {member.primary_phone_number && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Phone className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {member.email && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Mail className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </div>
                    <div className="ml-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

        {/* Birthday Stats Card */}
        <Card className="border">
          <CardHeader className="flex border-b border-border/50 pb-4">
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" /> Birthday Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-5 bg-muted-foreground/20 rounded w-40 mb-4"></div>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-stat-${index}`} className="flex items-center gap-2">
                    <div className="w-24 h-4 bg-muted-foreground/20 rounded"></div>
                    <div className="flex-1 h-2 bg-muted-foreground/10 rounded-full">
                      <div className="h-full w-0 bg-muted-foreground/20 rounded-full"></div>
                    </div>
                    <div className="w-8 h-4 bg-muted-foreground/20 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-4">Birthdays by Month</h3>
                <div className="space-y-2">
                  {months.map((month, index) => (
                    <div key={month} className="flex items-center">
                      <div className="w-24 text-muted-foreground">{month}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${birthdayStats[index] > 0 ? (birthdayStats[index] / maxBirthdayCount) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <div className="w-8 text-right ml-2">{birthdayStats[index]}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Birthdays Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center">
                <Cake className="h-5 w-5 mr-2 text-primary" /> {months[selectedMonth]} Birthdays
              </CardTitle>
              <CardDescription>Members with birthdays in {months[selectedMonth]}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-auto"
              />
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
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
                            <div className="h-4 w-32 bg-muted rounded"></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-muted"></div>
                          <div className="h-4 w-24 bg-muted rounded"></div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 bg-muted rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-muted"></div>
                          <div className="h-4 w-32 bg-muted rounded"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredBirthdays.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBirthdays.map(member => {
                    if (!member.date_of_birth) return null;

                    const birthDate = parseDate(member.date_of_birth);
                    if (!birthDate) return null;

                    const age = calculateAge(member.date_of_birth) || 0;
                    const nextBirthday = new Date(currentDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                    if (nextBirthday < currentDate) {
                      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
                    }

                    // Calculate days until birthday
                    const diffTime = nextBirthday.getTime() - currentDate.getTime();
                    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
                    const countdown = getDayCountdown(member.date_of_birth);

                    return (
                      <TableRow key={member.id} className={isUpcoming ? "bg-primary/5" : undefined}>
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
                            <span>{formatBirthdayDate(birthDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span>{age} years</span>
                            {isUpcoming && (
                              <div className="text-xs font-medium mt-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 inline-block">
                                {countdown}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {member.primary_phone_number ? (
                              <>
                                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm truncate max-w-[150px]">{member.primary_phone_number}</span>
                              </>
                            ) : member.email ? (
                              <>
                                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm truncate max-w-[150px]">{member.email}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-sm">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full border p-6 mb-4">
                <Cake className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">No birthdays found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? "Try adjusting your search criteria."
                  : `There are no members with birthdays in ${months[selectedMonth]}.`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
