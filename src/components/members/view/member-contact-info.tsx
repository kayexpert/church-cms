"use client";

import { Phone, Mail, MapPin, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface MemberContactInfoProps {
  member: {
    primaryPhoneNumber?: string;
    secondaryPhoneNumber?: string;
    email?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  isEditing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MemberContactInfo({
  member,
  isEditing,
  onInputChange
}: MemberContactInfoProps) {

  return (
    <div className="bg-muted border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Primary Phone</p>
            {isEditing ? (
              <Input
                type="text"
                name="primaryPhoneNumber"
                value={member.primaryPhoneNumber || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.primaryPhoneNumber || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Secondary Phone</p>
            {isEditing ? (
              <Input
                type="text"
                name="secondaryPhoneNumber"
                value={member.secondaryPhoneNumber || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.secondaryPhoneNumber || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Email</p>
            {isEditing ? (
              <Input
                type="email"
                name="email"
                value={member.email || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.email || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Address</p>
            {isEditing ? (
              <Input
                type="text"
                name="address"
                value={member.address || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.address || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Emergency Contact Name</p>
            {isEditing ? (
              <Input
                type="text"
                name="emergencyContactName"
                value={member.emergencyContactName || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.emergencyContactName || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Emergency Contact Phone</p>
            {isEditing ? (
              <Input
                type="text"
                name="emergencyContactPhone"
                value={member.emergencyContactPhone || ''}
                onChange={onInputChange}
                className="mt-1 w-full"
              />
            ) : (
              <p className="font-medium">{member.emergencyContactPhone || 'N/A'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
