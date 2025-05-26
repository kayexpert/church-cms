"use client";

import { useState, useEffect, useRef } from "react";
import { User, Calendar, Edit, Trash2, X, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { MemberProfileHeader } from "./member-profile-header";
import { MemberContactInfo } from "./member-contact-info";
import { MemberPersonalInfo } from "./member-personal-info";
import { MemberChurchInfo } from "./member-church-info";
import { MemberDatesInfo } from "./member-dates-info";
import { MemberAttendanceTab } from "./member-attendance-tab";
import { MemberFinanceTab } from "./member-finance-tab";
import { DeleteMemberDialog } from "@/components/members/delete-member-dialog";

import {
  updateMember,
  getDepartments,
  getCertificates,
  getCovenantFamilies,
  updateMemberDepartments,
  updateMemberCertificates,
  uploadMemberImage,
  Department,
  Certificate,
  CovenantFamily
} from "@/services/member-service";

import {
  getAttendanceByMember,
  subscribeToMemberAttendanceUpdates
} from "@/services/attendance-service";

interface Member {
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
  spouseName?: string;
  numberOfChildren?: string;
  baptismDate?: string;
  membershipDate?: string;
  departments?: string[];
  certificates?: string[];
  covenantFamily?: string;
  status: 'active' | 'inactive';
  profileImage?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

interface ViewMemberDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberUpdate?: (updatedMember: Member) => void;
}

export function ViewMemberDialog({ member, open, onOpenChange, onMemberUpdate }: ViewMemberDialogProps) {
  // Function to handle modal close attempts
  const handleOpenChange = (newOpen: boolean) => {
    // If trying to close the modal and in edit mode, prevent closing
    if (!newOpen && isEditing) {
      return;
    }
    // Otherwise, allow the change
    onOpenChange(newOpen);
  };

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Member>({} as Member);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'finance'>('overview');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reference to the dialog content
  const dialogRef = useRef<HTMLDivElement>(null);

  // Use an effect to hide any element that might be displaying the member ID
  // This is a more efficient implementation that only runs once when the dialog opens
  useEffect(() => {
    if (!open || !dialogRef.current || !member?.id) return;

    // Function to hide any element that might be displaying the member ID
    const hideIdElements = () => {
      // Use a more efficient query selector approach instead of tree walker
      const elements = dialogRef.current?.querySelectorAll('*');
      if (!elements) return;

      // Check text content of elements
      elements.forEach(el => {
        if (el.textContent?.includes(member.id)) {
          // Only hide if it's not a functional element (like a button or input)
          const tagName = el.tagName.toLowerCase();
          if (!['button', 'input', 'select', 'textarea'].includes(tagName)) {
            // Hide the element
            (el as HTMLElement).style.display = 'none';
          }
        }
      });
    };

    // Run the function only once when the dialog opens
    hideIdElements();

    // No need for the timeout that was causing flickering
  }, [open, member?.id]);

  // State for departments, certificates, and covenant families
  const [departments, setDepartments] = useState<Department[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [covenantFamilies, setCovenantFamilies] = useState<CovenantFamily[]>([]);
  const [isLoading, setIsLoading] = useState<{
    departments: boolean;
    certificates: boolean;
    covenantFamilies: boolean;
    attendance: boolean;
    member: boolean;
  }>({
    departments: false,
    certificates: false,
    covenantFamilies: false,
    attendance: false,
    member: true // Start with member loading
  });

  // State for attendance records
  const [attendanceRecords, setAttendanceRecords] = useState<{
    id: string;
    date: string;
    event_type: string;
    event_name?: string;
    members: {
      member_id: string;
      present: boolean;
      notes?: string;
    }[];
    created_at?: string;
    updated_at?: string;
  }[]>([]);

  // Fetch departments, certificates, covenant families, and attendance records when the dialog opens
  useEffect(() => {
    if (open && member?.id) {
      fetchDepartments();
      fetchCertificates();
      fetchCovenantFamilies();

      // Fetch attendance records when the attendance tab is active
      if (activeTab === 'attendance') {
        fetchAttendanceRecords();
      }
    }
  }, [open, member?.id, activeTab]);

  // Fetch attendance records for the member
  const fetchAttendanceRecords = async () => {
    if (!member?.id) return;

    setIsLoading(prev => ({ ...prev, attendance: true }));
    try {
      const response = await getAttendanceByMember(member.id);
      if (response.error) {
        console.error("Error fetching attendance records:", response.error);
        toast.error("Failed to load attendance records");
      } else if (response.data) {
        setAttendanceRecords(response.data);
      }
    } catch (error) {
      console.error("Unexpected error fetching attendance records:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, attendance: false }));
    }
  };

  // Subscribe to attendance updates for this member
  useEffect(() => {
    if (!member?.id) return;

    // Subscribe to updates
    const unsubscribe = subscribeToMemberAttendanceUpdates(member.id, (records) => {
      setAttendanceRecords(records);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [member?.id]);

  // Fetch departments from the database
  const fetchDepartments = async () => {
    setIsLoading(prev => ({ ...prev, departments: true }));
    try {
      const response = await getDepartments();
      if (response.error) {
        console.error("Error fetching departments:", response.error);
        toast.error("Failed to load departments");
      } else if (response.data) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error("Unexpected error fetching departments:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, departments: false }));
    }
  };

  // Fetch certificates from the database
  const fetchCertificates = async () => {
    setIsLoading(prev => ({ ...prev, certificates: true }));
    try {
      const response = await getCertificates();
      if (response.error) {
        console.error("Error fetching certificates:", response.error);
        toast.error("Failed to load certificates");
      } else if (response.data) {
        setCertificates(response.data);
      }
    } catch (error) {
      console.error("Unexpected error fetching certificates:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, certificates: false }));
    }
  };

  // Fetch covenant families from the database
  const fetchCovenantFamilies = async () => {
    setIsLoading(prev => ({ ...prev, covenantFamilies: true }));
    try {
      const response = await getCovenantFamilies();
      if (response.error) {
        console.error("Error fetching covenant families:", response.error);
        toast.error("Failed to load covenant families");
      } else if (response.data) {
        setCovenantFamilies(response.data);
      }
    } catch (error) {
      console.error("Unexpected error fetching covenant families:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, covenantFamilies: false }));
    }
  };

  // Initialize form data when member changes - only when the modal opens or member ID changes
  useEffect(() => {
    if (member && open) {
      // Set loading state to true
      setIsLoading(prev => ({ ...prev, member: true }));

      // Fetch the complete member data to ensure we have all fields
      const fetchCompleteData = async () => {
        try {
          // Import the member service dynamically to avoid circular dependencies
          const { getMemberById } = await import('@/services/member-service');

          console.log(`Fetching complete data for member ${member.id}`);

          // Fetch the complete member data
          const response = await getMemberById(member.id);

          if (response.error) {
            console.error("Error fetching complete member data:", response.error);
            // Use the member data we already have
            const initialDepartments = Array.isArray(member.departments) ? member.departments : [];
            const initialCertificates = Array.isArray(member.certificates) ? member.certificates : [];

            console.log(`Using existing member data with departments: ${initialDepartments.length} and certificates: ${initialCertificates.length}`);

            setFormData({
              ...member,
              // Ensure these fields are properly set even if they're undefined in the member object
              primaryPhoneNumber: member.primaryPhoneNumber || '',
              secondaryPhoneNumber: member.secondaryPhoneNumber || '',
              email: member.email || '',
              address: member.address || '',
              emergencyContactName: member.emergencyContactName || '',
              emergencyContactPhone: member.emergencyContactPhone || '',
              dateOfBirth: member.dateOfBirth || '',
              occupation: member.occupation || '',
              maritalStatus: member.maritalStatus || '',
              spouseName: member.spouseName || '',
              numberOfChildren: member.numberOfChildren || '',
              departments: initialDepartments,
              certificates: initialCertificates,
            });
          } else if (response.data) {
            // Import the utility function dynamically
            const { transformDatabaseMemberToUIMember } = await import('@/lib/member-utils');

            // Transform the database member to UI format
            const completeMember = transformDatabaseMemberToUIMember(response.data);

            // Ensure departments and certificates are arrays
            const memberDepartments = Array.isArray(completeMember.departments) ? completeMember.departments : [];
            const memberCertificates = Array.isArray(completeMember.certificates) ? completeMember.certificates : [];

            console.log(`Transformed member data with departments: ${memberDepartments.length} and certificates: ${memberCertificates.length}`);

            // Set the form data with the complete member data
            setFormData({
              ...completeMember,
              // Ensure these fields are properly set even if they're undefined in the member object
              primaryPhoneNumber: completeMember.primaryPhoneNumber || '',
              secondaryPhoneNumber: completeMember.secondaryPhoneNumber || '',
              email: completeMember.email || '',
              address: completeMember.address || '',
              emergencyContactName: completeMember.emergencyContactName || '',
              emergencyContactPhone: completeMember.emergencyContactPhone || '',
              dateOfBirth: completeMember.dateOfBirth || '',
              occupation: completeMember.occupation || '',
              maritalStatus: completeMember.maritalStatus || '',
              spouseName: completeMember.spouseName || '',
              numberOfChildren: completeMember.numberOfChildren || '',
              departments: memberDepartments,
              certificates: memberCertificates,
            });
          }
        } catch (error) {
          console.error("Unexpected error fetching member data:", error);
          // Use the member data we already have
          const initialDepartments = Array.isArray(member.departments) ? member.departments : [];
          const initialCertificates = Array.isArray(member.certificates) ? member.certificates : [];

          console.log(`Error fallback: Using existing member data with departments: ${initialDepartments.length} and certificates: ${initialCertificates.length}`);

          setFormData({
            ...member,
            // Ensure these fields are properly set even if they're undefined in the member object
            primaryPhoneNumber: member.primaryPhoneNumber || '',
            secondaryPhoneNumber: member.secondaryPhoneNumber || '',
            email: member.email || '',
            address: member.address || '',
            emergencyContactName: member.emergencyContactName || '',
            emergencyContactPhone: member.emergencyContactPhone || '',
            dateOfBirth: member.dateOfBirth || '',
            occupation: member.occupation || '',
            maritalStatus: member.maritalStatus || '',
            spouseName: member.spouseName || '',
            numberOfChildren: member.numberOfChildren || '',
            departments: initialDepartments,
            certificates: initialCertificates,
          });
        } finally {
          // Set the preview image
          setPreviewImage(member.profileImage || null);

          // Set loading state to false
          setIsLoading(prev => ({ ...prev, member: false }));
        }
      };

      // Fetch the complete member data
      fetchCompleteData();
    }
  }, [member?.id, open]);

  // Reset to overview tab whenever the dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('overview');
    }
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Function to handle age change and update date of birth
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = parseInt(e.target.value);
    if (isNaN(newAge)) return;

    // Calculate birth date based on the new age
    const today = new Date();
    const birthYear = today.getFullYear() - newAge;
    const birthDate = new Date(birthYear, today.getMonth(), today.getDate());

    // Update the dateOfBirth field
    setFormData((prev) => ({
      ...prev,
      dateOfBirth: birthDate.toISOString().split('T')[0],
    }));
  };

  const handleStatusChange = (status: 'active' | 'inactive') => {
    setFormData((prev) => ({
      ...prev,
      status,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        setFormData((prev) => ({
          ...prev,
          profileImage: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDepartmentsChange = (values: string[]) => {
    setFormData(prev => ({
      ...prev,
      departments: values
    }));
  };

  const handleCertificatesChange = (values: string[]) => {
    setFormData(prev => ({
      ...prev,
      certificates: values
    }));
  };

  const handleCovenantFamilyChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      covenantFamily: value
    }));
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName) {
        toast.error("First name and last name are required");
        return;
      }

      setIsSaving(true);

      // Convert UI member to database format
      const dbMember = {
        first_name: formData.firstName,
        middle_name: formData.middleName || undefined,
        last_name: formData.lastName,
        gender: formData.gender || undefined,
        date_of_birth: formData.dateOfBirth ?
          (typeof formData.dateOfBirth === 'string' ?
            formData.dateOfBirth :
            new Date(formData.dateOfBirth).toISOString().split('T')[0])
          : undefined,
        primary_phone_number: formData.primaryPhoneNumber || undefined,
        secondary_phone_number: formData.secondaryPhoneNumber || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        occupation: formData.occupation || undefined,
        marital_status: formData.maritalStatus || undefined,
        spouse_name: formData.spouseName || undefined,
        number_of_children: formData.numberOfChildren || undefined,
        status: formData.status || 'active',
        profile_image: formData.profileImage || undefined,
        emergency_contact_name: formData.emergencyContactName || undefined,
        emergency_contact_phone: formData.emergencyContactPhone || undefined,
        covenant_family_id: formData.covenantFamily || undefined,
        baptism_date: formData.baptismDate || undefined,
        membership_date: formData.membershipDate || undefined
      };

      // Upload image if it's a new one (base64 string)
      if (formData.profileImage && formData.profileImage.startsWith('data:image')) {
        try {
          // Preparing to upload image for member

          // Convert base64 to File object
          const base64Response = await fetch(formData.profileImage);
          const blob = await base64Response.blob();
          const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

          // Image converted to file

          // Upload the image
          const uploadResponse = await uploadMemberImage(file, formData.id);
          if (uploadResponse.error) {
            console.error("Error uploading image:", uploadResponse.error);
            toast.error(`Failed to upload profile image: ${uploadResponse.error.message}`);
          } else if (uploadResponse.data) {
            // Image uploaded successfully
            // Update the profile image URL in the member data
            dbMember.profile_image = uploadResponse.data;
          }
        } catch (imageError) {
          console.error("Unexpected error during image upload:", imageError);
          toast.error(`Image upload failed: ${(imageError as Error).message}`);
        }
      }

      // Update the member in the database
      const updateResponse = await updateMember(formData.id, dbMember);
      if (updateResponse.error) {
        console.error("Error updating member:", updateResponse.error);
        toast.error("Failed to update member");
        return;
      }

      console.log("Member updated successfully in database:", updateResponse.data);

      // Ensure departments is an array before updating
      const departmentsToUpdate = Array.isArray(formData.departments) ? formData.departments : [];
      // Updating member departments

      // Always update departments (even if empty array)
      const deptResponse = await updateMemberDepartments(formData.id, departmentsToUpdate);
      if (deptResponse.error) {
        console.error("Error updating member departments:", deptResponse.error);
        toast.error("Failed to update member departments");
      } else {
        // Successfully updated member departments
      }

      // Ensure certificates is an array before updating
      const certificatesToUpdate = Array.isArray(formData.certificates) ? formData.certificates : [];
      // Updating member certificates

      // Always update certificates (even if empty array)
      const certResponse = await updateMemberCertificates(formData.id, certificatesToUpdate);
      if (certResponse.error) {
        console.error("Error updating member certificates:", certResponse.error);
        toast.error("Failed to update member certificates");
      } else {
        // Successfully updated member certificates
      }

      // Updated member departments and certificates

      // Add a small delay to ensure database operations have completed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the updated member data to ensure we have the latest data
      // Import the member service dynamically to avoid circular dependencies
      const { getMemberById } = await import('@/services/member-service');
      // Fetching updated member data
      const updatedMemberResponse = await getMemberById(formData.id);

      if (updatedMemberResponse.error) {
        console.error("Error fetching updated member:", updatedMemberResponse.error);
        // Still use the form data we have
        if (onMemberUpdate) {
          onMemberUpdate(formData);
        }
      } else if (updatedMemberResponse.data) {
        // Successfully fetched updated member data

        // Transform the database member to UI format
        const freshMember = {
          ...formData,
          // Ensure departments and certificates are properly set from the database
          departments: updatedMemberResponse.data.departments || [],
          certificates: updatedMemberResponse.data.certificates || []
        };

        // Update our form data
        setFormData(freshMember);

        // Notify parent component about the update with the fresh data
        if (onMemberUpdate) {
          onMemberUpdate(freshMember);
        }

        // Updated member with fresh data
      } else {
        // No data returned when fetching updated member
        // If we couldn't fetch the updated member, use the one we have
        if (onMemberUpdate) {
          onMemberUpdate(formData);
        }
      }

      toast.success("Member updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving member:", error);
      toast.error("Failed to update member. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original member data
    setFormData({ ...member });
    setPreviewImage(member.profileImage || null);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (activeTab !== 'overview') {
      setActiveTab('overview');
    }
    setIsEditing(true);
  };

  const handleDelete = () => {
    onOpenChange(false);
    setIsDeleteOpen(true);
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[900px] max-h-[90vh] p-0 border-none md:overflow-hidden overflow-y-auto"
          ref={dialogRef}
        >
          <DialogTitle className="sr-only">Member Details</DialogTitle>
          <div className="p-4 flex items-center justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Member Details</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full hover:bg-muted"
              disabled={isEditing}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-0">
            {/* Left sidebar with profile info */}
            {isLoading.member ? (
              // Profile Header Skeleton
              <div className="flex flex-col items-center text-center px-4 pb-3 animate-pulse">
                <div className="w-full" style={{ marginTop: '20px' }}>
                  {/* Skeleton for buttons */}
                  <div className="flex justify-center gap-2 mb-4">
                    <div className="h-9 w-20 bg-muted rounded animate-pulse"></div>
                    <div className="h-9 w-20 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="mb-4 flex flex-col items-center relative">
                    <div className="h-28 w-28 bg-muted rounded-full border-4 border-border"></div>
                    {/* Skeleton for status badge */}
                    <div className="absolute bottom-0 right-1/3 transform translate-x-1/2">
                      <div className="h-6 w-16 bg-muted rounded-full"></div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <div className="h-8 w-40 bg-muted rounded mx-auto"></div>
                    <div className="h-4 w-32 bg-muted rounded mx-auto"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="h-4 w-16 bg-muted rounded mx-auto mb-2"></div>
                      <div className="h-6 w-12 bg-muted rounded mx-auto"></div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="h-4 w-16 bg-muted rounded mx-auto mb-2"></div>
                      <div className="h-6 w-12 bg-muted rounded mx-auto"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <MemberProfileHeader
                member={formData}
                isEditing={isEditing}
                isSaving={isSaving}
                previewImage={previewImage}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCancel={handleCancel}
                onSave={handleSave}
                onStatusChange={handleStatusChange}
                onImageChange={handleImageChange}
                onInputChange={handleInputChange}
                onAgeChange={handleAgeChange}
                onGenderChange={(value) => handleSelectChange('gender', value)}
              />
            )}

            {/* Main content area */}
            <div className="px-4 pb-3 flex flex-col h-full">
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  if (isEditing && value !== activeTab) {
                    if (confirm('You have unsaved changes. Discard changes and switch tab?')) {
                      setFormData({ ...member });
                      setIsEditing(false);
                      setActiveTab(value as 'overview' | 'attendance' | 'finance');
                    }
                  } else {
                    setActiveTab(value as 'overview' | 'attendance' | 'finance');
                  }
                }}
                className="flex flex-col h-full"
              >
                <TabsList className="bg-transparent border-b border-border w-full h-auto p-0 rounded-none sticky top-0 bg-background z-10 md:relative">
                  <TabsTrigger
                    value="overview"
                    className="px-6 py-3 font-medium text-sm rounded-none data-[state=active]:bg-transparent data-[state=active]:text-green-500 data-[state=active]:shadow-none relative data-[state=active]:border-b-2 data-[state=active]:border-green-500"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Overview
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="px-6 py-3 font-medium text-sm rounded-none data-[state=active]:bg-transparent data-[state=active]:text-green-500 data-[state=active]:shadow-none relative data-[state=active]:border-b-2 data-[state=active]:border-green-500"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Attendance
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="finance"
                    className="px-6 py-3 font-medium text-sm rounded-none data-[state=active]:bg-transparent data-[state=active]:text-green-500 data-[state=active]:shadow-none relative data-[state=active]:border-b-2 data-[state=active]:border-green-500"
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                        <path d="M12 18V6" />
                      </svg>
                      Finance
                    </div>
                  </TabsTrigger>
                </TabsList>

                {/* Scrollable container for tab content - only scrollable on desktop */}
                <div className="flex-1 md:overflow-y-auto md:max-h-[60vh] overflow-visible">
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    {isLoading.member ? (
                      // Skeleton loader for overview tab with more realistic structure
                      <div className="animate-pulse space-y-6">
                        {/* Contact Info Section Skeleton */}
                        <div className="border rounded-lg p-6 space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-muted w-10 h-10 rounded-full"></div>
                            <div className="h-6 w-40 bg-muted rounded"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="h-4 w-24 bg-muted rounded"></div>
                              <div className="h-9 w-full bg-muted rounded"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-24 bg-muted rounded"></div>
                              <div className="h-9 w-full bg-muted rounded"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-muted rounded"></div>
                            <div className="h-9 w-full bg-muted rounded"></div>
                          </div>
                        </div>

                        {/* Personal Info Section Skeleton */}
                        <div className="border rounded-lg p-6 space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-muted w-10 h-10 rounded-full"></div>
                            <div className="h-6 w-40 bg-muted rounded"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="h-4 w-24 bg-muted rounded"></div>
                              <div className="h-9 w-full bg-muted rounded"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 w-24 bg-muted rounded"></div>
                              <div className="h-9 w-full bg-muted rounded"></div>
                            </div>
                          </div>
                        </div>

                        {/* Church Info Section Skeleton */}
                        <div className="border rounded-lg p-6 space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-muted w-10 h-10 rounded-full"></div>
                            <div className="h-6 w-40 bg-muted rounded"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-muted rounded"></div>
                            <div className="h-9 w-full bg-muted rounded"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-muted rounded"></div>
                            <div className="h-9 w-full bg-muted rounded"></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <MemberContactInfo
                          member={formData}
                          isEditing={isEditing}
                          onInputChange={handleInputChange}
                        />

                        <MemberPersonalInfo
                          member={formData}
                          isEditing={isEditing}
                          onInputChange={handleInputChange}
                          onSelectChange={handleSelectChange}
                        />

                        <MemberDatesInfo
                          member={formData}
                          isEditing={isEditing}
                          onInputChange={handleInputChange}
                        />

                        <MemberChurchInfo
                          member={formData}
                          departmentsList={departments}
                          certificatesList={certificates}
                          covenantFamiliesList={covenantFamilies}
                          isEditing={isEditing}
                          isLoading={{
                            departments: isLoading.departments,
                            certificates: isLoading.certificates,
                            covenantFamilies: isLoading.covenantFamilies
                          }}
                          onDepartmentsChange={handleDepartmentsChange}
                          onCertificatesChange={handleCertificatesChange}
                          onCovenantFamilyChange={handleCovenantFamilyChange}
                          onInputChange={handleInputChange}
                        />
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="attendance" className="mt-0">
                    <MemberAttendanceTab
                      memberId={member.id}
                      attendanceRecords={attendanceRecords}
                      isLoading={isLoading.attendance}
                    />
                  </TabsContent>

                  <TabsContent value="finance" className="mt-0">
                    <MemberFinanceTab
                      memberId={member.id}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteMemberDialog
        member={member}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onMemberDelete={() => {
          if (onMemberUpdate) {
            // Notify parent that the member was deleted
            onMemberUpdate({ ...member, status: 'inactive' });
          }
        }}
      />
    </>
  );
}
