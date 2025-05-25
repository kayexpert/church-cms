"use client";

import React from "react";
import { Card, CardProps } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GradientCardProps extends CardProps {
  color: "blue" | "green" | "purple" | "amber" | "red" | "cyan" | "pink" | "indigo";
  intensity?: "light" | "medium" | "strong";
  children: React.ReactNode;
}

export function GradientCard({ 
  color, 
  intensity = "medium", 
  className, 
  children, 
  ...props 
}: GradientCardProps) {
  const colorClasses = {
    blue: {
      light: "from-blue-500/10 to-blue-500/5 dark:from-blue-500/5 dark:to-blue-500/2",
      medium: "from-blue-500/20 to-blue-500/5 dark:from-blue-500/10 dark:to-blue-500/5",
      strong: "from-blue-500/30 to-blue-500/10 dark:from-blue-500/20 dark:to-blue-500/10",
    },
    green: {
      light: "from-green-500/10 to-green-500/5 dark:from-green-500/5 dark:to-green-500/2",
      medium: "from-green-500/20 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5",
      strong: "from-green-500/30 to-green-500/10 dark:from-green-500/20 dark:to-green-500/10",
    },
    purple: {
      light: "from-purple-500/10 to-purple-500/5 dark:from-purple-500/5 dark:to-purple-500/2",
      medium: "from-purple-500/20 to-purple-500/5 dark:from-purple-500/10 dark:to-purple-500/5",
      strong: "from-purple-500/30 to-purple-500/10 dark:from-purple-500/20 dark:to-purple-500/10",
    },
    amber: {
      light: "from-amber-500/10 to-amber-500/5 dark:from-amber-500/5 dark:to-amber-500/2",
      medium: "from-amber-500/20 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/5",
      strong: "from-amber-500/30 to-amber-500/10 dark:from-amber-500/20 dark:to-amber-500/10",
    },
    red: {
      light: "from-red-500/10 to-red-500/5 dark:from-red-500/5 dark:to-red-500/2",
      medium: "from-red-500/20 to-red-500/5 dark:from-red-500/10 dark:to-red-500/5",
      strong: "from-red-500/30 to-red-500/10 dark:from-red-500/20 dark:to-red-500/10",
    },
    cyan: {
      light: "from-cyan-500/10 to-cyan-500/5 dark:from-cyan-500/5 dark:to-cyan-500/2",
      medium: "from-cyan-500/20 to-cyan-500/5 dark:from-cyan-500/10 dark:to-cyan-500/5",
      strong: "from-cyan-500/30 to-cyan-500/10 dark:from-cyan-500/20 dark:to-cyan-500/10",
    },
    pink: {
      light: "from-pink-500/10 to-pink-500/5 dark:from-pink-500/5 dark:to-pink-500/2",
      medium: "from-pink-500/20 to-pink-500/5 dark:from-pink-500/10 dark:to-pink-500/5",
      strong: "from-pink-500/30 to-pink-500/10 dark:from-pink-500/20 dark:to-pink-500/10",
    },
    indigo: {
      light: "from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/5 dark:to-indigo-500/2",
      medium: "from-indigo-500/20 to-indigo-500/5 dark:from-indigo-500/10 dark:to-indigo-500/5",
      strong: "from-indigo-500/30 to-indigo-500/10 dark:from-indigo-500/20 dark:to-indigo-500/10",
    },
  };

  return (
    <Card 
      className={cn(
        `bg-gradient-to-br ${colorClasses[color][intensity]}`,
        className
      )} 
      {...props}
    >
      {children}
    </Card>
  );
}
