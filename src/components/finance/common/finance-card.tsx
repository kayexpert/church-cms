"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FinanceCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
}

/**
 * Reusable card component for finance items
 */
export function FinanceCard({
  title,
  description,
  children,
  className = "",
  isLoading = false
}: FinanceCardProps) {
  if (isLoading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-3/4" />
          {description && <Skeleton className="h-3 w-1/2" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

interface BalanceCardProps {
  title: string;
  description?: string;
  balance: number;
  onViewDetails?: () => void;
  viewDetailsLabel?: string;
  isLoading?: boolean;
  className?: string;
  formatCurrency?: (amount: number) => string;
}

/**
 * Specialized card for displaying account balances
 */
export function BalanceCard({
  title,
  description,
  balance,
  onViewDetails,
  viewDetailsLabel = "View Details",
  isLoading = false,
  className = "",
  formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount).replace('GH₵', '₵');
  }
}: BalanceCardProps) {
  return (
    <FinanceCard
      title={title}
      description={description}
      isLoading={isLoading}
      className={className}
    >
      <div className="text-2xl font-bold mb-4">
        {formatCurrency(balance)}
      </div>
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full py-2 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center justify-center"
        >
          {viewDetailsLabel}
        </button>
      )}
    </FinanceCard>
  );
}
