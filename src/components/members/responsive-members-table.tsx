"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, Trash2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileTableView } from "@/components/ui/mobile-table-view";
import { FinancePagination } from "@/components/finance/common/finance-pagination";
import { OptimizedMemberImage } from "@/components/members/optimized-member-image";
import { cn } from "@/lib/utils";

// UI Member interface
interface UIMember {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  primaryPhoneNumber?: string;
  secondaryPhoneNumber?: string;
  email?: string;
  address?: string;
  occupation?: string;
  maritalStatus?: string;
  membershipDate?: string;
  baptismDate?: string;
  departments?: string[];
  covenantFamily?: string;
  status: 'active' | 'inactive';
  profileImage?: string;
  spouseName?: string;
  numberOfChildren?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  notes?: string;
}

interface ResponsiveMembersTableProps {
  members: UIMember[];
  isLoading: boolean;
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onViewMember: (member: UIMember) => void;
  onDeleteMember: (member: UIMember) => void;
}

export function ResponsiveMembersTable({
  members,
  isLoading,
  totalCount,
  currentPage,
  itemsPerPage,
  onPageChange,
  onViewMember,
  onDeleteMember
}: ResponsiveMembersTableProps) {
  const [isMobile, setIsMobile] = useState(false);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Check if we're on the client side before accessing window
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Define columns for the table
  const columns = [
    {
      key: "profileImage",
      label: "PHOTO",
      primary: false,
      render: (_, member: UIMember) => {
        const initials = `${member.firstName[0]}${member.lastName[0]}`;
        return (
          <OptimizedMemberImage
            src={member.profileImage}
            alt={`${member.firstName} ${member.lastName}`}
            fallbackText={initials}
            className="h-10 w-10"
            size={40}
          />
        );
      }
    },
    {
      key: "name",
      label: "NAME",
      primary: true,
      render: (_, member: UIMember) => `${member.firstName} ${member.lastName}`
    },
    {
      key: "primaryPhoneNumber",
      label: "PHONE",
      primary: true,
      render: (value: string) => (
        <div className="flex items-center">
          <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          {value || "N/A"}
        </div>
      )
    },
    {
      key: "email",
      label: "EMAIL",
      primary: false,
      hideOnMobile: true,
      render: (value: string) => (
        <div className="flex items-center">
          <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          {value || "N/A"}
        </div>
      )
    },
    {
      key: "status",
      label: "STATUS",
      primary: true,
      render: (value: string) => (
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            value === "active"
              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"
              : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
          )}
        >
          {value}
        </Badge>
      )
    }
  ];

  // Actions for each row
  const renderActions = useCallback((member: UIMember) => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-500"
        onClick={(e) => {
          e.stopPropagation();
          onViewMember(member);
        }}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">View</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteMember(member);
        }}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  ), [onViewMember, onDeleteMember]);

  // If we're on mobile, use the mobile table view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <MobileTableView
          data={members}
          columns={columns}
          keyField="id"
          onRowClick={onViewMember}
          actions={renderActions}
          emptyMessage="No members found"
          className="mb-4"
        />

        {totalCount > 0 && (
          <FinancePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={itemsPerPage}
            onPageChange={onPageChange}
            showPageNumbers={false}
          />
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">

            <tbody className="divide-y">
              {members.map(member => (
                <tr
                  key={member.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onViewMember(member)}
                >
                  <td className="px-4 py-3">
                    {columns[0].render?.(member.profileImage, member) || member.profileImage}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {columns[1].render?.(member.name, member) || `${member.firstName} ${member.lastName}`}
                  </td>
                  <td className="px-4 py-3">
                    {columns[2].render?.(member.primaryPhoneNumber, member) || member.primaryPhoneNumber || "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    {columns[3].render?.(member.email, member) || member.email || "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    {columns[4].render?.(member.status, member) || member.status}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {renderActions(member)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalCount > 0 && (
        <FinancePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={itemsPerPage}
          onPageChange={onPageChange}
          className="mt-4"
        />
      )}
    </div>
  );
}
