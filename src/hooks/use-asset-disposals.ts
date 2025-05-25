"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AssetDisposal, ExtendedAssetDisposal } from "@/types/assets";
import { toast } from "sonner";
import { format } from "date-fns";

// Query keys for asset disposals
const ASSET_DISPOSALS_KEY = ["asset-disposals"];
const ASSETS_KEY = ["assets"];

// Consistent cache times for asset disposal queries
const DISPOSAL_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const DISPOSAL_GC_TIME = 1000 * 60 * 10; // 10 minutes

/**
 * Custom hook for fetching asset disposals with optional filtering and pagination
 */
export function useAssetDisposals(options: {
  search?: string;
  assetId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
} = {}) {
  const {
    search,
    assetId,
    accountId,
    startDate,
    endDate,
    page = 1,
    pageSize = 10,
    enabled = true
  } = options;

  return useQuery({
    queryKey: [...ASSET_DISPOSALS_KEY, { search, assetId, accountId, startDate, endDate, page, pageSize }],
    queryFn: async () => {
      // Calculate pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query
      let query = supabase
        .from("asset_disposals")
        .select(`
          *,
          assets(id, name, type_id, asset_types(id, name)),
          accounts(id, name, account_type)
        `, { count: 'exact' });

      // Apply filters
      if (assetId) {
        query = query.eq('asset_id', assetId);
      }

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      if (startDate) {
        query = query.gte('disposal_date', startDate);
      }

      if (endDate) {
        query = query.lte('disposal_date', endDate);
      }

      if (search) {
        // Search in related assets table
        query = query.or(`assets.name.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(from, to).order('disposal_date', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as ExtendedAssetDisposal[],
        count: count || 0
      };
    },
    enabled,
    staleTime: DISPOSAL_STALE_TIME,
    gcTime: DISPOSAL_GC_TIME
  });
}

/**
 * Custom hook for fetching a single asset disposal by ID
 */
export function useAssetDisposal(id?: string) {
  return useQuery({
    queryKey: [...ASSET_DISPOSALS_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("asset_disposals")
        .select(`
          *,
          assets(id, name, type_id, asset_types(id, name)),
          accounts(id, name, account_type)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as ExtendedAssetDisposal;
    },
    enabled: !!id,
    staleTime: DISPOSAL_STALE_TIME,
    gcTime: DISPOSAL_GC_TIME
  });
}

/**
 * Custom hook for asset disposal mutations (create, delete)
 */
export function useAssetDisposalMutations() {
  const queryClient = useQueryClient();

  // Dispose asset mutation
  const disposeAsset = useMutation({
    mutationFn: async (values: {
      asset_id: string;
      disposal_date: Date;
      disposal_amount: string;
      account_id: string;
    }) => {
      try {
        // Use the database function to handle the disposal process
        const { data, error } = await supabase
          .rpc("dispose_asset", {
            p_asset_id: values.asset_id,
            p_disposal_date: format(values.disposal_date, "yyyy-MM-dd"),
            p_disposal_amount: parseFloat(values.disposal_amount),
            p_account_id: values.account_id
          });

        if (error) throw error;
        return data;
      } catch (rpcError) {
        console.debug("Error in dispose_asset RPC call:", rpcError);

        // Try a manual approach as fallback
        try {
          // 1. Get the asset name
          const { data: assetData, error: assetError } = await supabase
            .from("assets")
            .select("name")
            .eq("id", values.asset_id)
            .single();

          if (assetError) throw new Error(`Failed to fetch asset: ${assetError.message}`);

          // 2. Get a default income category
          const { data: categoryData, error: categoryError } = await supabase
            .from("income_categories")
            .select("id")
            .or("name.ilike.%disposal%,name.ilike.%asset%")
            .limit(1);

          if (categoryError) throw new Error(`Failed to fetch categories: ${categoryError.message}`);

          let categoryId = categoryData?.[0]?.id;

          // If no specific category found, get the first income category
          if (!categoryId) {
            const { data: fallbackCategory, error: fallbackError } = await supabase
              .from("income_categories")
              .select("id")
              .limit(1);

            if (fallbackError) throw new Error(`Failed to fetch fallback category: ${fallbackError.message}`);
            categoryId = fallbackCategory?.[0]?.id;
          }

          if (!categoryId) throw new Error("No income category found");

          // 3. Create an income entry
          const { data: incomeData, error: incomeError } = await supabase
            .from("income_entries")
            .insert({
              account_id: values.account_id,
              category_id: categoryId,
              amount: parseFloat(values.disposal_amount),
              date: format(values.disposal_date, "yyyy-MM-dd"),
              description: `Disposal of asset: ${assetData.name}`,
              payment_method: "asset_disposal",
              payment_details: JSON.stringify({
                source: "asset_disposal",
                asset_id: values.asset_id
              })
            })
            .select();

          if (incomeError) throw new Error(`Failed to create income entry: ${incomeError.message}`);

          // 4. Create the asset disposal record
          const { data: disposalData, error: disposalError } = await supabase
            .from("asset_disposals")
            .insert({
              asset_id: values.asset_id,
              disposal_date: format(values.disposal_date, "yyyy-MM-dd"),
              disposal_amount: parseFloat(values.disposal_amount),
              account_id: values.account_id,
              income_entry_id: incomeData[0].id
            })
            .select();

          if (disposalError) throw new Error(`Failed to create disposal record: ${disposalError.message}`);

          // 5. Update the asset status to disposed
          const { error: updateError } = await supabase
            .from("assets")
            .update({
              status: "disposed",
              updated_at: new Date().toISOString()
            })
            .eq("id", values.asset_id);

          if (updateError) throw new Error(`Failed to update asset status: ${updateError.message}`);

          return disposalData[0].id;
        } catch (manualError) {
          console.error("Manual disposal approach failed:", manualError);
          throw manualError;
        }
      }
    },
    onSuccess: () => {
      // Invalidate both asset disposals and assets queries to refetch data
      queryClient.invalidateQueries({ queryKey: ASSET_DISPOSALS_KEY });
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      // Also invalidate income entries and account balances
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Asset disposed successfully");
    },
    onError: (error) => {
      console.error("Error disposing asset:", error);
      toast.error(`Failed to dispose asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Delete asset disposal mutation
  const deleteAssetDisposal = useMutation({
    mutationFn: async (id: string) => {
      try {
        // First get the disposal to find the related income entry
        const { data: disposal, error: fetchError } = await supabase
          .from("asset_disposals")
          .select("income_entry_id, asset_id")
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error("Error fetching disposal details:", fetchError);
          throw new Error(`Failed to fetch disposal details: ${fetchError.message}`);
        }

        if (!disposal) {
          throw new Error("Disposal not found");
        }

        try {
          // Start a transaction to delete both the disposal and income entry
          // and update the asset status
          // Note: We're trying both parameter orders to handle potential function signature differences
          try {
            const { error: deleteError } = await supabase.rpc("delete_asset_disposal", {
              p_disposal_id: id,
              p_income_entry_id: disposal.income_entry_id || null,
              p_asset_id: disposal.asset_id || null
            });

            if (deleteError) throw deleteError;
          } catch (firstOrderError) {
            // Try with different parameter order
            const { error: altOrderError } = await supabase.rpc("delete_asset_disposal", {
              p_asset_id: disposal.asset_id || null,
              p_disposal_id: id,
              p_income_entry_id: disposal.income_entry_id || null
            });

            if (altOrderError) throw altOrderError;
          }

          // If we reach here, one of the RPC calls succeeded
        } catch (rpcError) {
          // Don't log this error as it's expected and we have a fallback
          // Just log a debug message instead
          console.debug("Using manual delete fallback for asset disposal");

          // Try the manual delete endpoint as a fallback
          const response = await fetch('/api/db/manual-delete-asset-disposal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              disposalId: id,
              incomeEntryId: disposal.income_entry_id,
              assetId: disposal.asset_id
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Manual delete failed: ${errorData.error || response.statusText}`);
          }
        }

        return id;
      } catch (error) {
        console.error("Error in deleteAssetDisposal mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both asset disposals and assets queries to refetch data
      queryClient.invalidateQueries({ queryKey: ASSET_DISPOSALS_KEY });
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      // Also invalidate income entries and account balances
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Asset disposal deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting asset disposal:", error);
      toast.error(`Failed to delete asset disposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Update asset disposal mutation
  const updateAssetDisposal = useMutation({
    mutationFn: async (values: {
      id: string;
      disposal_date: Date;
      disposal_amount: string;
      account_id: string;
      income_entry_id: string;
    }) => {
      try {
        // First, try to create the update_asset_disposal function
        try {
          await fetch('/api/db/create-update-asset-disposal-function');
        } catch (fixError) {
          console.debug("Could not create update_asset_disposal function:", fixError);
        }

        try {
          // Try to use the database function to handle the update process
          const { error } = await supabase
            .rpc("update_asset_disposal", {
              p_disposal_id: values.id,
              p_disposal_date: format(values.disposal_date, "yyyy-MM-dd"),
              p_disposal_amount: parseFloat(values.disposal_amount),
              p_account_id: values.account_id,
              p_income_entry_id: values.income_entry_id
            });

          if (error) throw error;
        } catch (rpcError) {
          // Don't log this error as it's expected and we have a fallback
          console.debug("Using manual update fallback for asset disposal");

          // Try the manual update endpoint as a fallback
          const response = await fetch('/api/db/manual-update-asset-disposal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              disposalId: values.id,
              disposalDate: format(values.disposal_date, "yyyy-MM-dd"),
              disposalAmount: parseFloat(values.disposal_amount),
              accountId: values.account_id,
              incomeEntryId: values.income_entry_id
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Manual update failed: ${errorData.error || response.statusText}`);
          }
        }

        return values.id;
      } catch (error) {
        console.error("Error in updateAssetDisposal mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both asset disposals and assets queries to refetch data
      queryClient.invalidateQueries({ queryKey: ASSET_DISPOSALS_KEY });
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      // Also invalidate income entries and account balances
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Asset disposal updated successfully");
    },
    onError: (error) => {
      console.error("Error updating asset disposal:", error);
      toast.error(`Failed to update asset disposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  return {
    disposeAsset,
    deleteAssetDisposal,
    updateAssetDisposal
  };
}
