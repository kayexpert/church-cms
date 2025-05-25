/**
 * Member-related type definitions
 */

// Base Member type
export interface Member {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  spouse_name?: string;
  number_of_children?: string;
  primary_phone_number?: string;
  secondary_phone_number?: string;
  email?: string;
  address?: string;
  occupation?: string;
  profile_image?: string;
  covenant_family_id?: string;
  status: 'active' | 'inactive';
  membership_date?: string;
  baptism_date?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;

  // These fields are added when fetching a member with relations
  departments?: string[];
  certificates?: string[];

  // These fields are used for nested data from the database
  member_departments?: { department_id: string }[];
  member_certificates?: { certificate_id: string }[];
}

// Member with departments and certificates
// This interface ensures that departments and certificates are always defined
export interface MemberWithRelations extends Member {
  departments: string[];
  certificates: string[];
}

// Department type
export interface Department {
  id: string;
  name: string;
  description?: string;
  leader_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Certificate type
export interface Certificate {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Covenant Family type
export interface CovenantFamily {
  id: string;
  name: string;
  description?: string;
  leader_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Attendance Record type
export interface AttendanceRecord {
  id: string;
  date: string;
  eventType: string;
  eventName: string;
  members?: {
    memberId: string;
    present: boolean;
    notes?: string;
  }[];
  createdAt?: string;
}

// Member Statistics type
export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  newMembersThisMonth: number;
}

// Distribution data type (for charts)
export interface DistributionData {
  name: string;
  value: number;
}
