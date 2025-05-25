/**
 * Birthday messaging-related type definitions
 */

// Base Birthday Message type
export interface BirthdayMessage {
  id: string;
  name: string;
  content: string;
  days_before: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

// Birthday Message form values for creating/editing birthday messages
export interface BirthdayMessageFormValues {
  name: string;
  content: string;
  days_before?: number;
  status?: 'active' | 'inactive';
  template_id?: string | 'none';
}

// Birthday Message Log type
export interface BirthdayMessageLog {
  id: string;
  message_id: string;
  member_id: string;
  status: 'sent' | 'failed';
  error_message?: string;
  sent_at: string;
}

// UI Birthday Message type with formatted dates
export interface UIBirthdayMessage {
  id: string;
  name: string;
  content: string;
  daysBefore: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

// UI Birthday Message Log type with formatted dates and recipient information
export interface UIBirthdayMessageLog {
  id: string;
  messageName: string;
  memberName: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  sentAt: string;
}
