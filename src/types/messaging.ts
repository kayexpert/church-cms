/**
 * Messaging-related type definitions
 */

// Notification type for messaging system
export interface MessageNotification {
  id?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp?: string;
  duration?: number;
  autoDismiss?: boolean;
  showToast?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// SMS Provider Configuration
export interface MessagingConfiguration {
  id: string;
  provider_name: 'wigal';
  api_key?: string;
  api_secret?: string;
  base_url?: string;
  auth_type?: 'api_key';
  sender_id?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

// Form values for SMS Provider Configuration
export interface MessagingConfigFormValues {
  provider_name: 'wigal';
  api_key?: string;
  api_secret?: string;
  base_url?: string;
  auth_type?: 'api_key';
  sender_id?: string;
  is_default?: boolean;
}

// Base Message type
export interface Message {
  id: string;
  name: string;
  content: string;
  type: 'quick' | 'group' | 'birthday';
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly'; // Database constraint only allows these values
  schedule_time: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'scheduled' | 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string; // Error message if the message failed to send
  created_at?: string;
  updated_at?: string;
  // Additional fields for birthday messages
  days_before?: number; // Days before birthday to send message
}

// Message with recipients
export interface MessageWithRecipients extends Message {
  recipients: MessageRecipient[];
}

// Message Recipient type
export interface MessageRecipient {
  id: string;
  message_id: string;
  recipient_type: 'individual' | 'group';
  recipient_id: string;
  created_at?: string;
}

// Message Log type
export interface MessageLog {
  id: string;
  message_id: string;
  recipient_id: string;
  status: 'sent' | 'failed' | 'pending' | 'delivered' | 'rejected' | 'expired' | 'error';
  error_message?: string;
  message_id_from_provider?: string;
  message_type?: 'quick' | 'group' | 'birthday'; // Type of message (quick, group, birthday)
  sent_at: string;
  delivered_at?: string;
  delivery_status?: string;
  delivery_status_details?: string;
  cost?: number;
  segments?: number;
}

// Message Template type
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  message_type?: 'text' | 'unicode' | 'flash';
  supports_scheduling?: boolean;
  personalization_tokens?: string[];
  created_at?: string;
  updated_at?: string;
}

// Message form values for creating/editing messages
export interface MessageFormValues {
  name: string;
  content: string;
  type: 'quick' | 'group' | 'birthday';
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly'; // Database constraint only allows these values
  schedule_time: Date;
  end_date?: Date;
  status: 'active' | 'inactive' | 'scheduled' | 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string; // Error message if the message failed to send
  recipients: {
    type: 'individual' | 'group';
    ids: string[];
  };
  template_id?: string | 'none';
  // Additional fields for birthday messages
  days_before?: number; // Days before birthday to send message
}

// Message Template form values
export interface MessageTemplateFormValues {
  name: string;
  content: string;
  message_type?: 'text' | 'unicode' | 'flash';
  supports_scheduling?: boolean;
  personalization_tokens?: string[];
}

// UI Message type with formatted dates and recipient information
export interface UIMessage {
  id: string;
  name: string;
  content: string;
  type: 'quick' | 'group' | 'birthday';
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly'; // Database constraint only allows these values
  scheduleTime: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'scheduled' | 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string; // Error message if the message failed to send
  recipientType: 'individual' | 'group';
  recipientCount: number;
  createdAt: string;
  // Additional fields for birthday messages
  daysBefore?: number; // Days before birthday to send message
}

// UI Message Log type with formatted dates and recipient information
export interface UIMessageLog {
  id: string;
  messageName: string;
  recipientName: string;
  status: 'sent' | 'failed' | 'pending' | 'delivered' | 'rejected' | 'expired' | 'error';
  errorMessage?: string;
  sentAt: string;
  deliveredAt?: string;
  deliveryStatus?: string;
  deliveryStatusDetails?: string;
  cost?: number;
  segments?: number;
}
