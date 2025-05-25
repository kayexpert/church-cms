"use client";

import { useState, useEffect, useMemo } from "react";
import { CalendarIcon, Filter } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTodayFormatted, toISODateString } from "@/lib/date-utils";

import { AttendanceRecordForm } from "./attendance-record-form";
import { AttendanceStats } from "./attendance-stats";
import { MemberAttendanceList } from "./member-attendance-list";
import { AttendanceHistory } from "./attendance-history";
import { RecordViewDialog } from "./record-view-dialog";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

import { getMembers } from "@/services/member-service";
import {
  addAttendanceRecord,
  getAttendanceByDateAndType,
  getAttendanceRecords,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  formatEventType,
  AttendanceRecord,
  subscribeToAttendanceUpdates
} from "@/services/attendance-service";

// Define the Member type for this component
interface Member {
  id: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
  status: 'active' | 'inactive';
  email?: string;
  primary_phone_number?: string;
}

export function MembersAttendance() {
  // Get today's date in YYYY-MM-DD format
  const todayFormatted = getTodayFormatted();

  // State variables
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayFormatted);
  const [selectedEvent, setSelectedEvent] = useState<string>("sunday");
  const [presentMemberIds, setPresentMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [savedAttendanceRecords, setSavedAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editedMemberIds, setEditedMemberIds] = useState<string[]>([]);
  const [existingRecord, setExistingRecord] = useState<AttendanceRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordIdToDelete, setRecordIdToDelete] = useState<string | null>(null);

  // Event type options
  const eventTypeOptions = [
    { value: "sunday", label: "Sunday Service" },
    { value: "midweek", label: "Midweek Service" },
    { value: "bible_study", label: "Bible Study" },
    { value: "prayer", label: "Prayer Meeting" },
    { value: "special", label: "Special Event" },
    { value: "other", label: "Other Event" },
  ];

  // Fetch members on component mount
  useEffect(() => {
    const fetchMembers = async () => {
      setIsFetching(true);
      try {
        const { data, error } = await getMembers();
        if (error) {
          console.error("Error fetching members:", error);
          toast.error("Failed to load members");
        } else if (data && data.data) {
          // Extract the members array from the paginated response
          setMembers(data.data);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
        toast.error("Failed to load members");
      } finally {
        setIsFetching(false);
      }
    };

    const fetchAttendanceRecords = async () => {
      try {
        const { data, error } = await getAttendanceRecords();
        if (error) {
          console.error("Error fetching attendance records:", error);
        } else if (data) {
          // Convert from database format to client format
          const clientRecords: AttendanceRecord[] = data.map(record => ({
            id: record.id,
            date: record.date,
            eventType: record.event_type,
            eventName: formatEventType(record.event_type),
            members: record.members ? record.members.map(m => ({
              memberId: m.member_id,
              present: m.present,
              notes: m.notes || ''
            })) : [],
            createdAt: record.created_at
          }));
          setSavedAttendanceRecords(clientRecords);
        }
      } catch (error) {
        console.error("Error fetching attendance records:", error);
      }
    };

    fetchMembers();
    fetchAttendanceRecords();
  }, []);

  // Subscribe to attendance updates
  useEffect(() => {
    // Subscribe to attendance updates
    const unsubscribe = subscribeToAttendanceUpdates((records) => {
      // Convert from database format to client format
      const clientRecords: AttendanceRecord[] = records.map(record => ({
        id: record.id,
        date: record.date,
        eventType: record.event_type,
        eventName: formatEventType(record.event_type),
        members: record.members ? record.members.map(m => ({
          memberId: m.member_id,
          present: m.present,
          notes: m.notes || ''
        })) : [],
        createdAt: record.created_at
      }));

      setSavedAttendanceRecords(clientRecords);

      // If we're currently viewing a record that was updated, update it
      if (selectedRecord) {
        const updatedRecord = clientRecords.find(r => r.id === selectedRecord.id);
        if (updatedRecord) {
          setSelectedRecord(updatedRecord);

          // If we're editing, update the edited member IDs
          if (isEditingRecord) {
            const presentIds = updatedRecord.members
              ?.filter(m => m.present)
              .map(m => m.memberId) || [];
            setEditedMemberIds(presentIds);
          }
        }
      }

      // If we're tracking an existing record for the current date/event, update it
      if (existingRecord) {
        const updatedExistingRecord = clientRecords.find(
          r => r.date === selectedDate && r.eventType === selectedEvent
        );
        if (updatedExistingRecord) {
          setExistingRecord(updatedExistingRecord);

          // Update present member IDs
          const presentIds = updatedExistingRecord.members
            ?.filter(m => m.present)
            .map(m => m.memberId) || [];
          setPresentMemberIds(presentIds);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [selectedRecord, isEditingRecord, existingRecord, selectedDate, selectedEvent]);

  // Check for existing record when date or event type changes
  useEffect(() => {
    const checkExistingRecord = async () => {
      try {
        const { data, error } = await getAttendanceByDateAndType(selectedDate, selectedEvent);

        if (error) {
          if (error.code !== 'PGRST116') { // Not found error
            console.error("Error checking existing record:", error);
          }
          // Reset present members if no record found
          setPresentMemberIds([]);
          setExistingRecord(null);
        } else if (data && data.members) {
          // Convert from database format to client format
          const clientRecord: AttendanceRecord = {
            id: data.id,
            date: data.date,
            eventType: data.event_type,
            eventName: formatEventType(data.event_type),
            members: data.members.map(m => ({
              memberId: m.member_id,
              present: m.present,
              notes: m.notes || ''
            })),
            createdAt: data.created_at
          };

          // Set existing record
          setExistingRecord(clientRecord);

          // Set present members from existing record
          const presentIds = data.members
            .filter(m => m.present)
            .map(m => m.member_id);
          setPresentMemberIds(presentIds);
        }
      } catch (error) {
        console.error("Error checking existing record:", error);
      }
    };

    checkExistingRecord();
  }, [selectedDate, selectedEvent]);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    return members
      .filter(member => {
        // Only show active members
        if (member.status !== "active") {
          return false;
        }

        // Search query
        if (searchQuery) {
          const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
          return fullName.includes(searchQuery.toLowerCase());
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by name
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [members, searchQuery]);

  // Calculate stats
  const totalMembers = filteredMembers.length;
  const presentCount = presentMemberIds.length;
  const absentCount = totalMembers - presentCount;
  const attendanceRate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;
  const absenceRate = totalMembers > 0 ? Math.round((absentCount / totalMembers) * 100) : 0;

  // Function to handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Use our utility function to format the date as YYYY-MM-DD
      const formattedDate = toISODateString(date);
      if (formattedDate) {
        setSelectedDate(formattedDate);
      }
    }
  };

  // Function to toggle a member's attendance
  const handleToggleAttendance = (memberId: string) => {
    setPresentMemberIds(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  // Function to mark all members as present
  const handleMarkAllPresent = () => {
    setPresentMemberIds(filteredMembers.map(member => member.id));
  };

  // Function to mark all members as absent
  const handleMarkAllAbsent = () => {
    setPresentMemberIds([]);
  };

  // Function to save attendance record
  const handleSaveAttendance = async () => {
    setIsLoading(true);
    try {
      // Create attendance record in the format expected by the database
      const record = {
        date: selectedDate,
        event_type: selectedEvent,
        event_name: formatEventType(selectedEvent),
        members: members
          .filter(m => m.status === 'active')
          .map(member => ({
            member_id: member.id,
            present: presentMemberIds.includes(member.id),
            notes: ''
          })),
      };

      let success = false;

      // If we have an existing record, update it instead of creating a new one
      if (existingRecord) {
        const { data, error } = await updateAttendanceRecord(existingRecord.id, record);

        if (error) {
          console.error("Error updating attendance:", error);
          toast.error("Failed to update attendance record");
        } else {
          toast.success("Attendance updated successfully");
          success = true;
        }
      } else {
        // Create a new record
        const { data, error } = await addAttendanceRecord(record);

        if (error) {
          console.error("Error saving attendance:", error);
          toast.error("Failed to save attendance record");
        } else {
          toast.success("Attendance recorded successfully");
          success = true;
        }
      }

      // The subscription system will automatically update the records
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance record");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to view past attendance record
  const handleViewRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsEditingRecord(false);
    // Initialize edited member IDs with the current present members
    if (record.members) {
      const presentIds = record.members
        .filter(m => m.present)
        .map(m => m.memberId);
      setEditedMemberIds(presentIds);
    }
  };

  // Function to close record view dialog
  const handleCloseRecordView = () => {
    setSelectedRecord(null);
    setIsEditingRecord(false);
  };

  // Function to toggle edit mode for attendance record
  const handleEditRecord = () => {
    setIsEditingRecord(true);
  };

  // Function to toggle a member's attendance in the edit mode
  const handleToggleEditAttendance = (memberId: string) => {
    setEditedMemberIds(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  // Function to save edited attendance record
  const handleSaveEditedRecord = async () => {
    if (!selectedRecord) return;

    try {
      // Get all members that should be included in the attendance record
      // This should include all members that were in the original record
      const memberIds = new Set<string>();

      // Add all members from the original record
      selectedRecord.members?.forEach(m => {
        memberIds.add(m.memberId);
      });

      // Add all active members that might not be in the original record
      members.filter(m => m.status === 'active').forEach(m => {
        memberIds.add(m.id);
      });

      // Create updated record in the format expected by the database
      const updatedRecord = {
        date: selectedRecord.date,
        event_type: selectedRecord.eventType,
        event_name: selectedRecord.eventName,
        members: Array.from(memberIds).map(memberId => ({
          member_id: memberId,
          present: editedMemberIds.includes(memberId),
          notes: ''
        })),
      };

      const { data, error } = await updateAttendanceRecord(selectedRecord.id, updatedRecord);

      if (error) {
        console.error("Error updating attendance record:", error);
        toast.error("Failed to update attendance record");
      } else {
        toast.success("Attendance record updated successfully");
        // The subscription system will automatically update the records

        setIsEditingRecord(false);
      }
    } catch (error) {
      console.error("Error updating attendance record:", error);
      toast.error("Failed to update attendance record");
    }
  };

  // Function to handle delete button click
  const handleDeleteRecord = (id: string) => {
    setRecordIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Function to confirm deletion
  const handleConfirmDelete = async () => {
    if (!recordIdToDelete) return;

    try {
      const { error } = await deleteAttendanceRecord(recordIdToDelete);

      if (error) {
        console.error("Error deleting attendance record:", error);
        toast.error("Failed to delete attendance record");
      } else {
        toast.success("Attendance record deleted successfully");
        // The subscription system will automatically update the records
      }
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      toast.error("Failed to delete attendance record");
    } finally {
      setIsDeleteDialogOpen(false);
      setRecordIdToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="record" className="space-y-6">
        <TabsList>
          <TabsTrigger value="record">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>Record Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <Filter className="h-4 w-4 mr-2" />
            <span>Attendance History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="space-y-6">
          {/* Attendance Recording Form */}
          <AttendanceRecordForm
            selectedDate={selectedDate}
            selectedEvent={selectedEvent}
            eventTypeOptions={eventTypeOptions}
            onDateChange={handleDateChange}
            onEventChange={setSelectedEvent}
          />

          {/* Stats Cards */}
          <AttendanceStats
            totalMembers={totalMembers}
            presentCount={presentCount}
            absentCount={absentCount}
            attendanceRate={attendanceRate}
            absenceRate={absenceRate}
          />

          {/* Member Attendance List */}
          <MemberAttendanceList
            filteredMembers={filteredMembers}
            presentMemberIds={presentMemberIds}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onToggleAttendance={handleToggleAttendance}
            onMarkAllPresent={handleMarkAllPresent}
            onMarkAllAbsent={handleMarkAllAbsent}
            onSaveAttendance={handleSaveAttendance}
            existingRecord={existingRecord}
            isLoading={isLoading}
            isFetching={isFetching}
            selectedDate={selectedDate}
            selectedEvent={selectedEvent}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Attendance History */}
          <AttendanceHistory
            savedAttendanceRecords={savedAttendanceRecords}
            isFetching={isFetching}
            onViewRecord={handleViewRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        </TabsContent>
      </Tabs>

      {/* Attendance Record View Dialog */}
      <RecordViewDialog
        selectedRecord={selectedRecord}
        isEditingRecord={isEditingRecord}
        editedMemberIds={editedMemberIds}
        members={members}
        onCloseRecordView={handleCloseRecordView}
        onEditRecord={handleEditRecord}
        onToggleEditAttendance={handleToggleEditAttendance}
        onSaveEditedRecord={handleSaveEditedRecord}
        onDeleteRecord={handleDeleteRecord}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
