"use client";

import { memo, useCallback } from "react";
import { Phone, Mail, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedMemberImage } from "./optimized-member-image";

// Import the UIMember interface
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

interface MemberCardProps {
  member: UIMember;
  onView: (member: UIMember) => void;
  onDelete: (member: UIMember) => void;
}

/**
 * Custom comparison function for MemberCard memo
 * This ensures the component re-renders when important properties change
 * but avoids unnecessary re-renders for properties that don't affect the UI
 */
const arePropsEqual = (prevProps: MemberCardProps, nextProps: MemberCardProps) => {
  // Always re-render if the member ID is different
  if (prevProps.member.id !== nextProps.member.id) return false;

  // Check for changes in key member properties that affect the UI
  // Only include properties that are actually displayed in the card
  return (
    prevProps.member.firstName === nextProps.member.firstName &&
    prevProps.member.lastName === nextProps.member.lastName &&
    prevProps.member.middleName === nextProps.member.middleName &&
    prevProps.member.primaryPhoneNumber === nextProps.member.primaryPhoneNumber &&
    prevProps.member.email === nextProps.member.email &&
    prevProps.member.status === nextProps.member.status &&
    prevProps.member.profileImage === nextProps.member.profileImage
  );
};

/**
 * Memoized MemberCard component to prevent unnecessary re-renders
 */
export const MemberCard = memo(function MemberCard({
  member,
  onView,
  onDelete
}: MemberCardProps) {
  // Pre-compute values that are used multiple times to avoid recalculation in the render
  const fullName = `${member.firstName} ${member.lastName}`;
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`;
  const imageAlt = `${member.firstName} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName}`;
  const isActive = member.status === "active";

  // Handle click events with memoized callbacks to prevent unnecessary re-renders
  const handleView = useCallback(() => onView(member), [onView, member]);
  const handleDelete = useCallback(() => onDelete(member), [onDelete, member]);

  return (
    <div
      className="rounded-lg border shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-primary/30 bg-card"
    >
      <div className="relative">
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={`text-xs sm:text-sm ${
              isActive
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="p-3 sm:p-6 text-center border-b bg-card">
          <OptimizedMemberImage
            src={member.profileImage}
            alt={imageAlt}
            fallbackText={initials}
            className="mx-auto mb-2 sm:mb-4 h-14 w-14 sm:h-20 sm:w-20 border-4 border-background shadow-sm"
            size={80}
          />
          <h3 className="text-sm sm:text-xl font-semibold truncate">
            {fullName}
          </h3>
        </div>
        <div className="p-3 sm:p-5 space-y-2 sm:space-y-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center text-xs sm:text-sm">
              <div className="bg-muted w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </div>
              <span className="truncate">{member.primaryPhoneNumber || 'No phone'}</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm">
              <div className="bg-muted w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </div>
              <span className="truncate">{member.email || 'No email'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between p-2 sm:p-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleView}
          className="text-blue-500 hover:text-blue-600 hover:bg-transparent text-xs sm:text-sm h-8 sm:h-9 p-0"
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">View</span>
        </Button>
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-600 hover:bg-transparent h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}, arePropsEqual);
