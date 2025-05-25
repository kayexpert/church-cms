"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Hook to fetch active members for use in dropdowns
 */
export function useActiveMembers() {
  return useQuery({
    queryKey: ["activeMembers"],
    queryFn: async () => {
      try {
        const { data, error, count } = await supabase
          .from("members")
          .select("id, first_name, middle_name, last_name", { count: "exact" })
          .eq("status", "active")
          .order("first_name", { ascending: true });

        if (error) {
          console.error("Error fetching active members:", error);
          throw new Error(error.message);
        }

        // Transform the data to a more usable format for dropdowns
        const formattedMembers = data.map(member => ({
          id: member.id,
          name: `${member.first_name} ${member.middle_name ? member.middle_name + ' ' : ''}${member.last_name}`.trim(),
          firstName: member.first_name,
          middleName: member.middle_name,
          lastName: member.last_name
        }));

        return {
          data: formattedMembers,
          count: count || 0
        };
      } catch (error) {
        console.error("Error in useActiveMembers:", error);
        toast.error("Failed to load members");
        return {
          data: [],
          count: 0
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
