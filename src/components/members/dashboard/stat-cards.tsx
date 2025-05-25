"use client";

import { Users, TrendingUp, CalendarCheck, Cake, User, UserCircle } from "lucide-react";
import { GradientCard } from "@/components/ui/gradient-card";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface StatCardsProps {
  data: {
    stats: {
      totalMembers: number;
      activeMembers: number;
      inactiveMembers: number;
      newMembersThisMonth: number;
    };
    activePercentage: string;
    inactivePercentage: string;
    genderData: {
      maleCount: number;
      femaleCount: number;
    };
    attendanceRate: string;
    birthdaysThisMonth: number;
  };
}

export function StatCards({ data }: StatCardsProps) {
  const { stats, activePercentage, genderData, attendanceRate, birthdaysThisMonth } = data;
  const { maleCount, femaleCount } = genderData;
  const totalGenderCount = maleCount + femaleCount;

  const malePercentage = totalGenderCount > 0 ? Math.round((maleCount / totalGenderCount) * 100) : 0;
  const femalePercentage = totalGenderCount > 0 ? Math.round((femaleCount / totalGenderCount) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <GradientCard color="blue" intensity="medium">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalMembers}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            Active: {stats.activeMembers} ({activePercentage}%)
          </p>
        </CardContent>
      </GradientCard>

      <GradientCard color="green" intensity="medium">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Gender Distribution</CardTitle>
          <div className="flex space-x-1">
            <User className="h-4 w-4 text-blue-500" />
            <UserCircle className="h-4 w-4 text-pink-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{maleCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Male ({malePercentage}%)
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-500">{femaleCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Female ({femalePercentage}%)
              </p>
            </div>
          </div>
        </CardContent>
      </GradientCard>

      <GradientCard color="purple" intensity="medium">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          <CalendarCheck className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalMembers > 0 ? `${attendanceRate}%` : "0.0%"}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            Average attendance
          </p>
        </CardContent>
      </GradientCard>

      <GradientCard color="amber" intensity="medium">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Birthdays This Month</CardTitle>
          <Cake className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{birthdaysThisMonth || 0}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            <Cake className="h-3 w-3 mr-1 text-amber-500" />
            {new Date().toLocaleString('default', { month: 'long' })}
          </p>
        </CardContent>
      </GradientCard>
    </div>
  );
}
