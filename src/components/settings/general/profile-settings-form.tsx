"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, X, User, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
import { ensureProfilesTable } from "@/lib/db-utils";

// Define the form schema
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address").optional(),
  phone: z.string().optional(),
  profileImage: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettingsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  // Initialize form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: user?.email || "",
      phone: "",
      profileImage: "",
    },
  });

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

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

  // Handle removing the image
  const handleRemoveImage = () => {
    setPreviewImage(null);
    form.setValue("profileImage", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        // Ensure the profiles table exists with the required columns
        const tableExists = await ensureProfilesTable();

        if (!tableExists) {
          // If we couldn't ensure the table exists, use default values
          form.reset({
            firstName: "",
            lastName: "",
            email: user.email || "",
            phone: "",
            profileImage: "",
          });
          return;
        }

        // Try to get the user's profile
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle(); // Use maybeSingle instead of single to handle missing profiles

        if (error && error.code !== "PGRST116") { // PGRST116 is "Results contain 0 rows"
          console.error("Error loading profile:", error);
          toast.error("Failed to load profile. Using default values.");
        }

        // If we have profile data, use it
        if (data) {
          form.reset({
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            email: user.email || "",
            phone: data.phone || "",
            profileImage: data.profile_image || "",
          });

          // Set preview image if available
          if (data.profile_image) {
            setPreviewImage(data.profile_image);
          }
        } else {
          // If no profile exists, create one
          console.log("No profile found. Creating a new profile.");

          // Set default values in the form
          form.reset({
            firstName: "",
            lastName: "",
            email: user.email || "",
            phone: "",
            profileImage: "",
          });

          // Try to create a profile record
          try {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                first_name: "",
                last_name: "",
                phone: "",
                profile_image: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertError) {
              console.error("Error creating profile:", insertError);
            }
          } catch (insertError) {
            console.error("Exception creating profile:", insertError);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);

        // Set default values even if there's an error
        form.reset({
          firstName: "",
          lastName: "",
          email: user.email || "",
          phone: "",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, form, toast]);

  // Handle form submission
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    try {
      setIsLoading(true);

      // Ensure the profiles table exists with the required columns
      const tableExists = await ensureProfilesTable();

      if (!tableExists) {
        // If we couldn't ensure the table exists, show an error
        toast.error(
          "Unable to update profile. Please contact an administrator to set up the database."
        );
        return;
      }

      let profileImageUrl = form.getValues("profileImage");

      // Upload image if it's a new one (base64 string)
      if (values.profileImage && values.profileImage.startsWith('data:image')) {
        try {
          // Convert base64 to File object
          const base64Response = await fetch(values.profileImage);
          const blob = await base64Response.blob();
          const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

          // Upload the image
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', user.id);
          formData.append('bucketName', 'profiles');

          const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (!response.ok) {
            console.error('Upload error:', result.error);
            toast.error(`Failed to upload profile image: ${result.error}`);
          } else {
            // Set the profile image URL
            profileImageUrl = result.url;
          }
        } catch (imageError) {
          console.error("Error uploading image:", imageError);
          toast.error(`Image upload failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`);
        }
      }

      // Check if profile_image column exists using a safer approach
      // Try to select the profile_image column from a dummy query
      const { error: columnCheckError } = await supabase
        .from('profiles')
        .select('profile_image')
        .limit(1);

      // If there's an error and it mentions the column doesn't exist, then it doesn't exist
      const hasProfileImageColumn = !columnCheckError ||
        !columnCheckError.message.includes('column "profile_image" does not exist');

      // Update profile in the database with or without profile_image
      const { error } = await supabase
        .from("profiles")
        .upsert(
          hasProfileImageColumn
            ? {
                id: user.id,
                first_name: values.firstName,
                last_name: values.lastName,
                phone: values.phone || null,
                profile_image: profileImageUrl || null,
                updated_at: new Date().toISOString(),
              }
            : {
                id: user.id,
                first_name: values.firstName,
                last_name: values.lastName,
                phone: values.phone || null,
                updated_at: new Date().toISOString(),
              },
          {
            onConflict: "id" // Specify the conflict target
          }
        );

      if (error) {
        console.error("Error updating profile:", error);

        // Handle specific error cases
        if (error.code === "23505") { // Unique violation
          toast.error("A profile with this ID already exists. Please try again.");
        } else if (error.code === "42P01") { // Undefined table
          toast.error("The profiles table doesn't exist. Please contact an administrator.");
        } else if (error.code === "23503") { // Foreign key violation
          toast.error("User ID not found. Please check your authentication.");
        } else {
          toast.error(`Failed to update profile: ${error.message}`);
        }
        return;
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Image Upload */}
        <div className="flex justify-center py-6 border-b border-border/40 mb-4">
          <div className="flex flex-col items-center">
            <div className="relative group mb-3">
              {previewImage ? (
                <div className="relative">
                  <Avatar className="h-28 w-28 border-2 border-muted">
                    <AvatarImage src={previewImage} alt="Profile preview" className="object-cover" />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      <User className="h-10 w-10 text-primary/60" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="h-28 w-28 rounded-full bg-muted/40 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="profile-image"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {previewImage ? "Change Photo" : "Upload Photo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Upload a profile picture (max 5MB)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your email"
                  {...field}
                  disabled
                />
              </FormControl>
              <FormDescription>
                Email cannot be changed. Contact an administrator if you need to update your email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter your phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
