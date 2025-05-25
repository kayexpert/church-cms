"use client";

import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

import { MemberImageUpload } from "./member-image-upload";
import { PersonalInfoForm } from "./personal-info-form";
import { ContactInfoForm } from "./contact-info-form";
import { ChurchInfoForm } from "./church-info-form";
import { ChurchDatesForm } from "./church-dates-form";

import {
  uploadMemberImage,
  getDepartments,
  getCertificates,
  getCovenantFamilies,
  updateMemberDepartments,
  updateMemberCertificates,
  updateMember,
  Department,
  Certificate,
  CovenantFamily
} from "@/services/member-service";
import { useMemberMutations } from "@/hooks/useMembers";

const memberFormSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  middleName: z.string().optional(),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  dateOfBirth: z.date().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  numberOfChildren: z.string().optional(),
  primaryPhoneNumber: z.string().optional(),
  secondaryPhoneNumber: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }).optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  covenantFamily: z.string().optional(),
  departments: z.array(z.string()).default([]),
  certificates: z.array(z.string()).default([]),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
  profileImage: z.string().optional(),
  membershipDate: z.date().optional(),
  baptismDate: z.date().optional(),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded?: () => void;
}

export function AddMemberDialog({ open, onOpenChange, onMemberAdded }: AddMemberDialogProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the addMember mutation
  const { addMember } = useMemberMutations();

  // State for departments, certificates, and covenant families
  const [departments, setDepartments] = useState<Department[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [covenantFamilies, setCovenantFamilies] = useState<CovenantFamily[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<{
    departments: boolean;
    certificates: boolean;
    covenantFamilies: boolean;
  }>({
    departments: false,
    certificates: false,
    covenantFamilies: false
  });

  // Fetch departments, certificates, and covenant families when the dialog opens
  useEffect(() => {
    if (open) {
      fetchDepartments();
      fetchCertificates();
      fetchCovenantFamilies();
    }
  }, [open]);

  // Fetch departments from the database
  const fetchDepartments = async () => {
    setIsLoadingData(prev => ({ ...prev, departments: true }));
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
      setIsLoadingData(prev => ({ ...prev, departments: false }));
    }
  };

  // Fetch certificates from the database
  const fetchCertificates = async () => {
    setIsLoadingData(prev => ({ ...prev, certificates: true }));
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
      setIsLoadingData(prev => ({ ...prev, certificates: false }));
    }
  };

  // Fetch covenant families from the database
  const fetchCovenantFamilies = async () => {
    setIsLoadingData(prev => ({ ...prev, covenantFamilies: true }));
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
      setIsLoadingData(prev => ({ ...prev, covenantFamilies: false }));
    }
  };

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "",
      maritalStatus: "",
      spouseName: "",
      numberOfChildren: "",
      primaryPhoneNumber: "",
      secondaryPhoneNumber: "",
      email: "",
      address: "",
      occupation: "",
      status: "active",
      covenantFamily: "",
      departments: [] as string[],
      certificates: [] as string[],
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
      notes: "",
      profileImage: "",
      membershipDate: undefined,
      baptismDate: undefined,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        form.setValue("profileImage", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    form.setValue("profileImage", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: MemberFormValues) => {
    setIsLoading(true);
    try {
      // Convert UI member to database format
      const dbMember = {
        first_name: data.firstName,
        middle_name: data.middleName || undefined,
        last_name: data.lastName,
        gender: data.gender || undefined,
        date_of_birth: data.dateOfBirth ? data.dateOfBirth.toISOString().split('T')[0] : undefined,
        primary_phone_number: data.primaryPhoneNumber || undefined,
        secondary_phone_number: data.secondaryPhoneNumber || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        occupation: data.occupation || undefined,
        marital_status: data.maritalStatus || undefined,
        spouse_name: data.spouseName || undefined,
        number_of_children: data.numberOfChildren || undefined,
        status: data.status || 'active',
        profile_image: undefined, // Will be updated after upload
        emergency_contact_name: data.emergencyContactName || undefined,
        emergency_contact_phone: data.emergencyContactPhone || undefined,
        emergency_contact_relationship: data.emergencyContactRelationship || undefined,
        covenant_family_id: data.covenantFamily || undefined,
        membership_date: data.membershipDate ? data.membershipDate.toISOString().split('T')[0] : undefined,
        baptism_date: data.baptismDate ? data.baptismDate.toISOString().split('T')[0] : undefined
      };

      // Add the member to the database using the mutation
      console.log("Adding member with data:", dbMember);
      const response = await addMember.mutateAsync(dbMember);
      if (response.error) {
        console.error("Error adding member:", response.error);
        toast.error(`Failed to add member: ${response.error.message || 'Unknown error'}`);
        return;
      }

      const newMemberId = response.data?.id;
      if (!newMemberId) {
        console.error("No member ID returned");
        toast.error("Failed to add member");
        return;
      }

      // Upload image if provided
      if (data.profileImage) {
        try {
          console.log("Preparing to upload image for new member:", newMemberId);

          // Convert base64 to File object
          const base64Response = await fetch(data.profileImage);
          const blob = await base64Response.blob();
          const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

          console.log("Image converted to file, size:", file.size, "bytes");

          // Upload the image
          const uploadResponse = await uploadMemberImage(file, newMemberId);
          if (uploadResponse.error) {
            console.error("Error uploading image:", uploadResponse.error);
            toast.error(`Member added but failed to upload profile image: ${uploadResponse.error.message}`);
          } else if (uploadResponse.data) {
            console.log("Image uploaded successfully:", uploadResponse.data);

            // Update the member with the profile image URL
            console.log("Updating member with profile image URL:", uploadResponse.data);
            const imageUpdateResponse = await updateMember(newMemberId, {
              profile_image: uploadResponse.data
            });

            if (imageUpdateResponse.error) {
              console.error("Error updating member with profile image:", imageUpdateResponse.error);
              toast.error("Member added but failed to update profile image URL");
            }
          }
        } catch (imageError) {
          console.error("Unexpected error during image upload:", imageError);
          toast.error(`Image upload failed: ${(imageError as Error).message}`);
        }
      }

      // Add departments if selected
      if (data.departments && data.departments.length > 0) {
        // Make sure we're using department IDs, not names
        const departmentIds = data.departments;
        const deptResponse = await updateMemberDepartments(newMemberId, departmentIds);
        if (deptResponse.error) {
          console.error("Error adding member departments:", deptResponse.error);
          toast.error("Member added but failed to add departments");
        }
      }

      // Add certificates if selected
      if (data.certificates && data.certificates.length > 0) {
        // Make sure we're using certificate IDs, not names
        const certificateIds = data.certificates;
        const certResponse = await updateMemberCertificates(newMemberId, certificateIds);
        if (certResponse.error) {
          console.error("Error adding member certificates:", certResponse.error);
          toast.error("Member added but failed to add certificates");
        }
      }

      toast.success("Member added successfully");
      form.reset();
      setStep(1);
      setPreviewImage(null);

      // Close the dialog and notify parent component that a member was added
      onOpenChange(false);

      // Notify parent component that a member was added
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    const fieldsToValidate = step === 1
      ? ["firstName", "lastName", "gender", "dateOfBirth", "maritalStatus", "status"]
      : step === 2
        ? ["email", "primaryPhoneNumber", "address", "occupation"]
        : ["covenantFamily"];

    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      setStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Handle closing the dialog - reset form and close
  const handleClose = () => {
    // Reset the form to default values
    form.reset();
    // Reset the step to the first step
    setStep(1);
    // Reset preview image
    setPreviewImage(null);
    // Close the dialog
    onOpenChange(false);
  };

  // Handle dialog open change with custom logic
  const handleOpenChange = (newOpen: boolean) => {
    // If trying to close the dialog (newOpen is false)
    if (!newOpen) {
      // Reset the form and close the dialog
      handleClose();
    } else {
      // Just open the dialog without any reset
      onOpenChange(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-semibold">Add New Member</DialogTitle>
          <DialogDescription className="mt-1.5">
            Enter the details of the new member. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Step {step} of 3</div>
            <div className="text-sm text-muted-foreground">
              {step === 1 ? "Personal Information" : step === 2 ? "Contact Information" : "Church Information"}
            </div>
          </div>
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
            {/* Image Upload Section - Always visible */}
            <MemberImageUpload
              previewImage={previewImage}
              onImageChange={handleImageChange}
              onRemoveImage={handleRemoveImage}
            />

            {step === 1 && (
              <PersonalInfoForm
                control={form.control}
                watch={form.watch}
              />
            )}

            {step === 2 && (
              <ContactInfoForm
                control={form.control}
              />
            )}

            {step === 3 && (
              <>
                <ChurchDatesForm
                  control={form.control}
                />

                <ChurchInfoForm
                  control={form.control}
                  departments={departments}
                  certificates={certificates}
                  covenantFamilies={covenantFamilies}
                  isLoadingData={isLoadingData}
                />
              </>
            )}
          </form>
        </Form>

        <div className="px-6 py-5 border-t flex items-center justify-between mt-4 bg-muted/10">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handlePrevious} className="gap-2 h-10 transition-all duration-200 hover:translate-x-[-2px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
                  <path d="m12 19-7-7 7-7"/>
                  <path d="M19 12H5"/>
                </svg>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleClose} className="h-10">
              Cancel
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={handleNext} className="gap-2 h-10 transition-all duration-200 hover:translate-x-[2px]">
                Next
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </Button>
            ) : (
              <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="gap-2 h-10 min-w-[140px]">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Member
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
