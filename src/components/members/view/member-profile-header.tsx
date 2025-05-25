"use client";

import { useRef, useEffect, useMemo } from "react";
import { Edit, Trash2, Upload, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedMemberImage } from "@/components/members/optimized-member-image";
import { StatusBadge } from "../shared/status-badge";
import { calculateAge } from "@/lib/utils";

export interface MemberProfileHeaderProps {
  member: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender?: string;
    dateOfBirth?: string;
    departments?: string[];
    status: 'active' | 'inactive';
    profileImage?: string;
  };
  isEditing: boolean;
  isSaving?: boolean;
  previewImage: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  onStatusChange: (status: 'active' | 'inactive') => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAgeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenderChange: (value: string) => void;
}

// Size mapping for avatar sizes
const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-36 w-36"
};

// Size mapping for Next.js Image component
const imageSizes = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 144
};

export function MemberProfileHeader({
  member,
  isEditing,
  isSaving = false,
  previewImage,
  onEdit,
  onDelete,
  onCancel,
  onSave,
  onStatusChange,
  onImageChange,
  onInputChange,
  onAgeChange,
  onGenderChange
}: MemberProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize the initials to prevent unnecessary re-renders
  const initials = useMemo(() =>
    `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`,
    [member.firstName, member.lastName]
  );

  // Add a style to hide any element that might be displaying the member ID
  const hideIdStyle = {
    display: 'none !important'
  };

  // Use an effect to hide any element that might be displaying the member ID
  useEffect(() => {
    if (!containerRef.current) return;

    // Function to hide any element that might be displaying the member ID
    const hideIdElements = () => {
      // Get all paragraphs in the container
      const paragraphs = containerRef.current?.querySelectorAll('p');

      // Check each paragraph to see if it contains the member ID
      paragraphs?.forEach(p => {
        const text = p.textContent || '';
        // If the paragraph contains the member ID or matches a UUID pattern, hide it
        if (text.includes(member.id) ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text.trim())) {
          p.style.display = 'none';
        }
      });
    };

    // Run the function immediately
    hideIdElements();

    // Also run it after a short delay to catch any elements that might be added dynamically
    const timeoutId = setTimeout(hideIdElements, 100);

    // Clean up
    return () => clearTimeout(timeoutId);
  }, [member.id]);

  return (
    <div className="flex flex-col items-center text-center px-4 pb-3" ref={containerRef}>
      <div className="w-full" style={{ marginTop: '20px' }}>
        {/* Edit and Delete buttons at the top of the profile image */}
        {!isEditing && (
          <div className="flex justify-center gap-2 mb-4">
            <Button
              variant="default"
              size="sm"
              onClick={onEdit}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
        {isEditing && (
          <div className="flex justify-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}

        {isEditing ? (
          <div className="relative group mb-4">
            <OptimizedMemberImage
              src={previewImage}
              alt={`${member.firstName} ${member.lastName}`}
              fallbackText={initials}
              className={`mx-auto border-4 border-border shadow-lg ${sizeClasses.xl}`}
              size={imageSizes.xl}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/60 w-full h-full rounded-full flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onImageChange}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 relative">
            <OptimizedMemberImage
              src={member.profileImage}
              alt={`${member.firstName} ${member.lastName}`}
              fallbackText={initials}
              className={`mx-auto border-4 border-border shadow-lg ${sizeClasses.xl}`}
              size={imageSizes.xl}
            />

            {/* Status badge positioned over the profile image */}
            <div className="absolute bottom-0 right-1/3 transform translate-x-1/2">
              <StatusBadge
                status={member.status}
              />
            </div>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3 w-full mt-4">
            <div className="flex justify-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange('active')}
                className={
                  member.status === 'active'
                    ? 'member-status-active-btn !bg-green-600 !hover:bg-green-700 !text-white !border-none'
                    : 'member-status-inactive-btn !bg-gray-800 !hover:bg-gray-700 !text-gray-300 !border-gray-700'
                }
              >
                Active
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange('inactive')}
                className={
                  member.status === 'inactive'
                    ? 'member-status-inactive-btn !bg-red-600 !hover:bg-red-700 !text-white !border-none'
                    : 'member-status-active-btn !bg-gray-800 !hover:bg-gray-700 !text-gray-300 !border-gray-700'
                }
              >
                Inactive
              </Button>
            </div>
            <div className="mb-3">
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={member.firstName || ''}
                onChange={onInputChange}
                placeholder="First Name"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="mb-3">
              <input
                id="middleName"
                type="text"
                name="middleName"
                value={member.middleName || ''}
                onChange={onInputChange}
                placeholder="Middle Name"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="mb-3">
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={member.lastName || ''}
                onChange={onInputChange}
                placeholder="Last Name"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl font-semibold mb-1">
              {`${member.firstName || ''} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName || ''}`}
            </h3>
            {/* Only show departments, never show the ID */}
            {member.departments && member.departments.length > 0 && (
              <p className="text-muted-foreground mb-4">{member.departments.join(', ')}</p>
            )}

            {/* Add a hidden element to override any potential ID display */}
            <div className="member-id-hidden" style={hideIdStyle} aria-hidden="true"></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Gender</p>
            {isEditing ? (
              <select
                value={member.gender || ''}
                onChange={(e) => onGenderChange(e.target.value)}
                className="mt-1 h-9 w-full text-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <p className="text-lg capitalize">{member.gender || 'N/A'}</p>
            )}
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Age</p>
            {isEditing ? (
              <input
                type="number"
                min="0"
                max="120"
                value={member.dateOfBirth ? calculateAge(member.dateOfBirth) : ''}
                onChange={onAgeChange}
                className="mt-1 h-9 w-full text-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            ) : (
              <p className="text-lg">{calculateAge(member.dateOfBirth) || 'N/A'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons removed - now in dialog header */}
    </div>
  );
}
