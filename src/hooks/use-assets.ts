"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Asset, AssetType, ExtendedAsset } from "@/types/assets";
import { toast } from "sonner";
import { format } from "date-fns";

// Query keys for assets
const ASSETS_KEY = ["assets"];
const ASSET_TYPES_KEY = ["asset-types"];

// Consistent cache times for asset queries
const ASSETS_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const ASSETS_GC_TIME = 1000 * 60 * 10; // 10 minutes
const ASSET_TYPES_STALE_TIME = 1000 * 60 * 30; // 30 minutes
const ASSET_TYPES_GC_TIME = 1000 * 60 * 60; // 1 hour

/**
 * Custom hook for fetching assets with optional filtering and pagination
 */
export function useAssets(options: {
  search?: string;
  typeId?: string;
  status?: 'active' | 'in_repair' | 'disposed';
  page?: number;
  pageSize?: number;
  enabled?: boolean;
} = {}) {
  const {
    search,
    typeId,
    status,
    page = 1,
    pageSize = 10,
    enabled = true
  } = options;

  return useQuery({
    queryKey: [...ASSETS_KEY, { search, typeId, status, page, pageSize }],
    queryFn: async () => {
      // Calculate pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query
      let query = supabase
        .from("assets")
        .select(`
          *,
          asset_types(id, name)
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (typeId) {
        query = query.eq('type_id', typeId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Apply pagination
      query = query.range(from, to).order('name', { ascending: true });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as ExtendedAsset[],
        count: count || 0
      };
    },
    enabled,
    staleTime: ASSETS_STALE_TIME,
    gcTime: ASSETS_GC_TIME
  });
}

/**
 * Custom hook for fetching a single asset by ID
 */
export function useAsset(id?: string) {
  return useQuery({
    queryKey: [...ASSETS_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("assets")
        .select(`
          *,
          asset_types(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as ExtendedAsset;
    },
    enabled: !!id,
    staleTime: ASSETS_STALE_TIME,
    gcTime: ASSETS_GC_TIME
  });
}

/**
 * Custom hook for fetching asset types
 */
export function useAssetTypes() {
  return useQuery({
    queryKey: ASSET_TYPES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_types")
        .select("*")
        .order('name', { ascending: true });

      if (error) throw error;

      return data as AssetType[];
    },
    staleTime: ASSET_TYPES_STALE_TIME,
    gcTime: ASSET_TYPES_GC_TIME
  });
}

/**
 * Custom hook for asset mutations (create, update, delete)
 */
export function useAssetMutations() {
  const queryClient = useQueryClient();

  // Create asset mutation
  const createAsset = useMutation({
    mutationFn: async (values: {
      name: string;
      type_id: string;
      acquisition_date: Date;
      acquisition_value: string;
      description?: string;
      status: 'active' | 'in_repair' | 'disposed';
    }) => {
      const assetData = {
        name: values.name,
        type_id: values.type_id,
        acquisition_date: format(values.acquisition_date, "yyyy-MM-dd"),
        acquisition_value: parseFloat(values.acquisition_value),
        description: values.description || null,
        status: values.status,
      };

      const { data, error } = await supabase
        .from("assets")
        .insert(assetData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate assets queries to refetch data
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      toast.success("Asset added successfully");
    },
    onError: (error) => {
      console.error("Error creating asset:", error);
      toast.error("Failed to add asset");
    }
  });

  // Update asset mutation
  const updateAsset = useMutation({
    mutationFn: async (values: {
      id: string;
      name: string;
      type_id: string;
      acquisition_date: Date;
      acquisition_value: string;
      description?: string;
      status: 'active' | 'in_repair' | 'disposed';
    }) => {
      const assetData = {
        name: values.name,
        type_id: values.type_id,
        acquisition_date: format(values.acquisition_date, "yyyy-MM-dd"),
        acquisition_value: parseFloat(values.acquisition_value),
        description: values.description || null,
        status: values.status,
      };

      const { data, error } = await supabase
        .from("assets")
        .update(assetData)
        .eq('id', values.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate assets queries to refetch data
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      toast.success("Asset updated successfully");
    },
    onError: (error) => {
      console.error("Error updating asset:", error);
      toast.error("Failed to update asset");
    }
  });

  // Delete asset mutation
  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      // Invalidate assets queries to refetch data
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      toast.success("Asset deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  });

  return {
    createAsset,
    updateAsset,
    deleteAsset
  };
}
