"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

// Define the form schema
const churchInfoSchema = z.object({
  name: z.string().min(2, "Church name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Please enter a valid email address"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  description: z.string().optional(),
  foundedYear: z.string().regex(/^\d{4}$/, "Please enter a valid year (YYYY)").optional().or(z.literal("")),
  denomination: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
});

type ChurchInfoFormValues = z.infer<typeof churchInfoSchema>;

export function ChurchInformationForm() {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with default values
  const form = useForm<ChurchInfoFormValues>({
    resolver: zodResolver(churchInfoSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      description: "",
      foundedYear: "",
      denomination: "",
      mission: "",
      vision: "",
    },
  });

  // Load church information from database
  const loadChurchInfo = async () => {
    try {
      setIsLoading(true);

      // Check if the church_info table exists
      try {
        const { data, error } = await supabase
          .from("church_info")
          .select("*")
          .single();

        if (error) {
          // If the error is not a "no rows returned" error, it might be a table not found error
          if (error.code !== 'PGRST116') {
            console.error("Error loading church information:", error);

            // Show a toast with instructions to set up the database
            toast.error(
              "Database tables not found. Please run 'npm run setup-database' to set up the database.",
              { duration: 10000 }
            );
            return;
          }
        }

        if (data) {
          form.reset({
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            description: data.description || "",
            foundedYear: data.founded_year || "",
            denomination: data.denomination || "",
            mission: data.mission || "",
            vision: data.vision || "",
          });
        }
      } catch (error) {
        console.error("Error loading church information:", error);

        // Show a toast with instructions to set up the database
        toast.error(
          "Database tables not found. Please run 'npm run setup-database' to set up the database.",
          { duration: 10000 }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load church info on component mount
  useEffect(() => {
    loadChurchInfo();
  }, []);

  // Handle form submission
  const onSubmit = async (values: ChurchInfoFormValues) => {
    try {
      setIsLoading(true);

      // Check if church info exists
      const { data: existingData, error: checkError } = await supabase
        .from("church_info")
        .select("id")
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      let result;

      if (existingData) {
        // Update existing record
        result = await supabase
          .from("church_info")
          .update({
            name: values.name,
            address: values.address,
            phone: values.phone,
            email: values.email,
            website: values.website,
            description: values.description,
            founded_year: values.foundedYear,
            denomination: values.denomination,
            mission: values.mission,
            vision: values.vision,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id);
      } else {
        // Insert new record
        result = await supabase
          .from("church_info")
          .insert({
            name: values.name,
            address: values.address,
            phone: values.phone,
            email: values.email,
            website: values.website,
            description: values.description,
            founded_year: values.foundedYear,
            denomination: values.denomination,
            mission: values.mission,
            vision: values.vision,
          });
      }

      if (result.error) {
        throw result.error;
      }

      toast.success("Church information saved successfully");
    } catch (error) {
      console.error("Error saving church information:", error);
      toast.error("Failed to save church information");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Church Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter church name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="denomination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Denomination</FormLabel>
                <FormControl>
                  <Input placeholder="Enter denomination" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter church address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="Enter website URL" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="foundedYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Founded Year</FormLabel>
                <FormControl>
                  <Input placeholder="YYYY" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter a brief description of the church"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mission Statement</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the church's mission statement"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vision"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vision Statement</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the church's vision statement"
                  className="min-h-[100px]"
                  {...field}
                />
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
