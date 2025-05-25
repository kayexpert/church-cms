import { supabase } from "@/lib/supabase";
import { ServiceResponse } from "@/types";

// Define the Attendance type based on the database schema
export interface Attendance {
  id: string;
  date: string;
  event_type: 'sunday' | 'midweek' | 'bible_study' | 'prayer' | 'special' | 'other';
  event_name?: string;
  members: {
    member_id: string;
    present: boolean;
    notes?: string;
  }[];
  created_at?: string;
  updated_at?: string;
}

// Client-side attendance record type
export interface AttendanceRecord {
  id: string;
  date: string;
  eventType: string;
  eventName?: string;
  presentMembers?: string[]; // For backward compatibility
  members?: {
    memberId: string;
    present: boolean;
    notes?: string;
  }[];
  createdAt?: string;
}

/**
 * Get all attendance records
 */
export async function getAttendanceRecords(): Promise<ServiceResponse<Attendance[]>> {
  try {
    // First, get all attendance records
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });

    if (attendanceError) {
      return { data: null, error: attendanceError };
    }

    if (!attendanceData || attendanceData.length === 0) {
      return { data: [], error: null };
    }

    // Get all attendance records for these attendance IDs
    const attendanceIds = attendanceData.map(record => record.id);
    const { data: memberRecords, error: memberError } = await supabase
      .from('attendance_records')
      .select('*')
      .in('attendance_id', attendanceIds);

    if (memberError) {
      return { data: null, error: memberError };
    }

    // Combine the data
    const combinedData = attendanceData.map(attendance => {
      const members = memberRecords
        ? memberRecords
            .filter(record => record.attendance_id === attendance.id)
            .map(record => ({
              member_id: record.member_id,
              present: record.present,
              notes: record.notes
            }))
        : [];

      return {
        ...attendance,
        members
      };
    });

    return { data: combinedData, error: null };
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get attendance records by date range
 */
export async function getAttendanceByDateRange(
  startDate: string,
  endDate: string
): Promise<ServiceResponse<Attendance[]>> {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error fetching attendance by date range:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get attendance records by event type
 */
export async function getAttendanceByEventType(
  eventType: string
): Promise<ServiceResponse<Attendance[]>> {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('event_type', eventType)
      .order('date', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error fetching attendance by event type:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get attendance records for a specific date and event type
 */
export async function getAttendanceByDateAndType(
  date: string,
  eventType: string
): Promise<ServiceResponse<Attendance>> {
  try {
    // First, get the attendance record
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date)
      .eq('event_type', eventType)
      .single();

    if (attendanceError) {
      return { data: null, error: attendanceError };
    }

    // Then, get the member attendance records
    const { data: memberRecords, error: memberError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('attendance_id', attendanceData.id);

    if (memberError) {
      return { data: null, error: memberError };
    }

    // Combine the data
    const members = memberRecords.map(record => ({
      member_id: record.member_id,
      present: record.present,
      notes: record.notes
    }));

    const combinedData = {
      ...attendanceData,
      members
    };

    return { data: combinedData, error: null };
  } catch (error) {
    console.error('Error fetching attendance by date and type:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Add a new attendance record
 */
export async function addAttendanceRecord(
  record: Omit<Attendance, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceResponse<Attendance>> {
  try {
    // Start a transaction
    // First, insert the main attendance record
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        date: record.date,
        event_type: record.event_type,
        event_name: record.event_name || formatEventType(record.event_type)
      })
      .select()
      .single();

    if (attendanceError) {
      console.error('Error inserting attendance record:', attendanceError);
      return { data: null, error: attendanceError };
    }

    // Then, insert the member attendance records
    const attendanceRecords = record.members.map(member => ({
      attendance_id: attendanceData.id,
      member_id: member.member_id,
      present: member.present,
      notes: member.notes || null
    }));

    const { error: membersError } = await supabase
      .from('attendance_records')
      .insert(attendanceRecords);

    if (membersError) {
      console.error('Error inserting attendance member records:', membersError);
      // Clean up the main record if member records fail
      await supabase.from('attendance').delete().eq('id', attendanceData.id);
      return { data: null, error: membersError };
    }

    // Create the complete record
    const completeRecord = {
      ...attendanceData,
      members: record.members
    };

    // Notify listeners of the update
    getAttendanceRecords().then(response => {
      if (response.data) {
        notifyAttendanceListeners(response.data);
      }
    });

    return {
      data: completeRecord,
      error: null
    };
  } catch (error) {
    console.error('Error adding attendance record:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing attendance record
 */
export async function updateAttendanceRecord(
  id: string,
  updates: Partial<Omit<Attendance, 'id' | 'created_at' | 'updated_at'>>
): Promise<ServiceResponse<Attendance>> {
  try {
    // First, update the main attendance record
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .update({
        date: updates.date,
        event_type: updates.event_type,
        event_name: updates.event_name
      })
      .eq('id', id)
      .select()
      .single();

    if (attendanceError) {
      console.error('Error updating attendance record:', attendanceError);
      return { data: null, error: attendanceError };
    }

    // If members are provided, update the member attendance records
    if (updates.members && updates.members.length > 0) {
      // First, delete existing member records
      const { error: deleteError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('attendance_id', id);

      if (deleteError) {
        console.error('Error deleting existing attendance member records:', deleteError);
        return { data: null, error: deleteError };
      }

      // Then, insert the new member records
      const attendanceRecords = updates.members.map(member => ({
        attendance_id: id,
        member_id: member.member_id,
        present: member.present,
        notes: member.notes || null
      }));

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(attendanceRecords);

      if (insertError) {
        console.error('Error inserting updated attendance member records:', insertError);
        return { data: null, error: insertError };
      }
    }

    // Get the updated record with members
    const { data: memberRecords, error: memberError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('attendance_id', id);

    if (memberError) {
      console.error('Error fetching updated member records:', memberError);
      return { data: null, error: memberError };
    }

    // Combine the data
    const members = memberRecords.map(record => ({
      member_id: record.member_id,
      present: record.present,
      notes: record.notes
    }));

    const combinedData = {
      ...attendanceData,
      members
    };

    // Notify listeners of the update
    getAttendanceRecords().then(response => {
      if (response.data) {
        notifyAttendanceListeners(response.data);
      }
    });

    return { data: combinedData, error: null };
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete an attendance record
 */
export async function deleteAttendanceRecord(id: string): Promise<ServiceResponse<null>> {
  try {
    // First, delete the member attendance records
    const { error: memberError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('attendance_id', id);

    if (memberError) {
      console.error('Error deleting attendance member records:', memberError);
      return { data: null, error: memberError };
    }

    // Then, delete the main attendance record
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting main attendance record:', error);
      return { data: null, error };
    }

    // Notify listeners of the update
    getAttendanceRecords().then(response => {
      if (response.data) {
        notifyAttendanceListeners(response.data);
      }
    });

    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get attendance records for a specific member
 */
export async function getAttendanceByMember(
  memberId: string
): Promise<ServiceResponse<Attendance[]>> {
  try {
    // First, get all attendance records
    const { data: allAttendance, error: attendanceError } = await getAttendanceRecords();

    if (attendanceError) {
      return { data: null, error: attendanceError };
    }

    if (!allAttendance || allAttendance.length === 0) {
      return { data: [], error: null };
    }

    // Filter records where this member is included
    const memberAttendance = allAttendance.filter((record: Attendance) =>
      record.members.some((member: { member_id: string; present: boolean; notes?: string }) =>
        member.member_id === memberId
      )
    );

    return { data: memberAttendance, error: null };
  } catch (error) {
    console.error('Error fetching attendance by member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get attendance statistics
 */
export async function getAttendanceStats(): Promise<
  ServiceResponse<{
    totalEvents: number;
    averageAttendance: number;
    byEventType: Record<string, { count: number; average: number }>;
  }>
> {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*');

    if (error) {
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return {
        data: {
          totalEvents: 0,
          averageAttendance: 0,
          byEventType: {}
        },
        error: null
      };
    }

    // Calculate total events and average attendance
    const totalEvents = data.length;
    const totalAttendees = data.reduce((sum, record) =>
      sum + record.members.filter((m: { present: boolean }) => m.present).length, 0);
    const averageAttendance = totalAttendees / totalEvents;

    // Calculate stats by event type
    const byEventType: Record<string, { count: number; average: number }> = {};

    data.forEach(record => {
      const type = record.event_type;
      const presentCount = record.members.filter((m: { present: boolean }) => m.present).length;

      if (!byEventType[type]) {
        byEventType[type] = { count: 0, average: 0 };
      }

      byEventType[type].count++;
      const totalForType = byEventType[type].average * (byEventType[type].count - 1) + presentCount;
      byEventType[type].average = totalForType / byEventType[type].count;
    });

    return {
      data: {
        totalEvents,
        averageAttendance,
        byEventType
      },
      error: null
    };
  } catch (error) {
    console.error('Error calculating attendance stats:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Format event type for display
 */
export function formatEventType(eventType: string): string {
  switch (eventType) {
    case 'sunday':
      return 'Sunday Service';
    case 'midweek':
      return 'Midweek Service';
    case 'bible_study':
      return 'Bible Study';
    case 'prayer':
      return 'Prayer Meeting';
    case 'special':
      return 'Special Event';
    default:
      return eventType.charAt(0).toUpperCase() + eventType.slice(1).replace('_', ' ');
  }
}

// Event listeners for attendance updates
const attendanceListeners: ((records: Attendance[]) => void)[] = [];
const memberAttendanceListeners: Map<string, ((records: Attendance[]) => void)[]> = new Map();

/**
 * Subscribe to attendance updates
 * @param listener - Function to call when attendance records change
 * @returns Unsubscribe function
 */
export function subscribeToAttendanceUpdates(listener: (records: Attendance[]) => void): () => void {
  attendanceListeners.push(listener);

  // Return unsubscribe function
  return () => {
    const index = attendanceListeners.indexOf(listener);
    if (index !== -1) {
      attendanceListeners.splice(index, 1);
    }
  };
}

/**
 * Subscribe to attendance updates for a specific member
 * @param memberId - Member ID to subscribe to
 * @param listener - Function to call when attendance records change for this member
 * @returns Unsubscribe function
 */
export function subscribeToMemberAttendanceUpdates(
  memberId: string,
  listener: (records: Attendance[]) => void
): () => void {
  if (!memberAttendanceListeners.has(memberId)) {
    memberAttendanceListeners.set(memberId, []);
  }

  const listeners = memberAttendanceListeners.get(memberId)!;
  listeners.push(listener);

  // Return unsubscribe function
  return () => {
    const listeners = memberAttendanceListeners.get(memberId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  };
}

/**
 * Notify listeners of attendance updates
 * @param records - Updated attendance records
 */
function notifyAttendanceListeners(records: Attendance[]): void {
  // Notify global listeners
  attendanceListeners.forEach(listener => listener(records));

  // Notify member-specific listeners
  memberAttendanceListeners.forEach((listeners, memberId) => {
    // Filter records for this member
    const memberRecords = records.filter(record =>
      record.members.some(member => member.member_id === memberId)
    );

    // Notify listeners for this member
    listeners.forEach(listener => listener(memberRecords));
  });
}
