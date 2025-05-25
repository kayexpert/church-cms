"use client";

import { useState, Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

import { Asset, ExtendedAsset, ExtendedAssetDisposal } from "@/types/assets";
import { useAssets, useAssetMutations } from "@/hooks/use-assets";
import { useAssetDisposals, useAssetDisposalMutations } from "@/hooks/use-asset-disposals";
import { useAccounts } from "@/hooks/use-accounts";
import { AssetManagementSkeleton, AssetFormSkeleton, AssetListSkeleton } from "./asset-skeletons";
import { AssetDetailView } from "./asset-detail-view";

// Dynamically import components with skeleton fallbacks
const AssetForm = dynamic(
  () => import("./asset-form").then(mod => ({ default: mod.AssetForm })),
  { loading: () => <AssetFormSkeleton /> }
);

const AssetDisposalEditForm = dynamic(
  () => import("./asset-disposal-edit-form").then(mod => ({ default: mod.AssetDisposalEditForm })),
  { loading: () => <AssetFormSkeleton /> }
);

const AssetList = dynamic(
  () => import("./asset-list").then(mod => ({ default: mod.AssetList })),
  { loading: () => <AssetListSkeleton /> }
);

const AssetDisposalForm = dynamic(
  () => import("./asset-disposal-form").then(mod => ({ default: mod.AssetDisposalForm })),
  { loading: () => <AssetFormSkeleton /> }
);

const AssetDisposalList = dynamic(
  () => import("./asset-disposal-list").then(mod => ({ default: mod.AssetDisposalList })),
  { loading: () => <AssetListSkeleton /> }
);

export function AssetManagement() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Get the active tab from URL or default to "assets"
  const activeTab = searchParams.get("tab") || "assets";

  // State for asset list
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize] = useState(10);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState("");
  const [assetToEdit, setAssetToEdit] = useState<ExtendedAsset | null>(null);
  const [assetToDispose, setAssetToDispose] = useState<ExtendedAsset | null>(null);
  const [assetToView, setAssetToView] = useState<ExtendedAsset | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDisposeDialog, setShowDisposeDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);

  // State for disposal list
  const [disposalPage, setDisposalPage] = useState(1);
  const [disposalPageSize] = useState(10);
  const [disposalSearch, setDisposalSearch] = useState("");
  const [disposalToEdit, setDisposalToEdit] = useState<ExtendedAssetDisposal | null>(null);
  const [showEditDisposalDialog, setShowEditDisposalDialog] = useState(false);

  // Fetch assets with filters
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    refetch: refetchAssets
  } = useAssets({
    page: assetPage,
    pageSize: assetPageSize,
    search: assetSearch,
    typeId: assetTypeFilter && assetTypeFilter !== 'all' ? assetTypeFilter : undefined,
    status: assetStatusFilter && assetStatusFilter !== 'all' ? assetStatusFilter as any : undefined,
  });

  // Fetch asset disposals
  const {
    data: disposalsData,
    isLoading: isLoadingDisposals,
    refetch: refetchDisposals
  } = useAssetDisposals({
    page: disposalPage,
    pageSize: disposalPageSize,
    search: disposalSearch,
  });

  // Fetch accounts for disposal form
  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();

  // Get asset mutations
  const { deleteAsset } = useAssetMutations();

  // Get asset disposal mutations
  const { deleteAssetDisposal } = useAssetDisposalMutations();

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    // Update URL with the new tab
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`/asset-management?${params.toString()}`);
  }, [searchParams, router]);

  // Handle asset view
  const handleViewAsset = useCallback((asset: ExtendedAsset) => {
    setAssetToView(asset);
    setShowDetailView(true);
  }, []);

  // Handle asset edit
  const handleEditAsset = useCallback((asset: ExtendedAsset) => {
    setAssetToEdit(asset);
    setShowEditDialog(true);
  }, []);

  // Handle asset delete
  const handleDeleteAsset = useCallback(async (asset: ExtendedAsset) => {
    try {
      await deleteAsset.mutateAsync(asset.id);
      refetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  }, [deleteAsset, refetchAssets]);

  // Handle asset disposal
  const handleDisposeAsset = useCallback((asset: ExtendedAsset) => {
    setAssetToDispose(asset);
    setShowDisposeDialog(true);
  }, []);

  // Handle disposal delete
  const handleDeleteDisposal = useCallback(async (disposal: ExtendedAssetDisposal) => {
    // Create a unique ID for the toast
    const toastId = `delete-disposal-${disposal.id}`;

    try {
      // Show loading toast
      toast.loading("Deleting asset disposal...", { id: toastId });

      // Try to delete the disposal
      await deleteAssetDisposal.mutateAsync(disposal.id);

      // Dismiss loading toast
      toast.dismiss(toastId);

      // Refetch data
      refetchDisposals();
      refetchAssets();
      // Also refetch income entries
      queryClient.invalidateQueries({ queryKey: ["income"] });

      // Show success toast
      toast.success("Asset disposal deleted successfully", { id: toastId });
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(toastId);

      // Check if the asset was actually deleted despite the error
      const { data, error: checkError } = await supabase
        .from("asset_disposals")
        .select("id")
        .eq("id", disposal.id)
        .single();

      if (checkError && checkError.code === "PGRST116") {
        // Error code PGRST116 means "no rows returned" - the disposal is gone
        // This means the operation actually succeeded despite the error
        toast.success("Asset disposal was successfully deleted", { id: toastId });
        refetchDisposals();
        refetchAssets();
        queryClient.invalidateQueries({ queryKey: ["income"] });
      } else {
        // If we get here, there was a real error
        console.error("Error deleting asset disposal:", error);
        toast.error("Failed to delete asset disposal. Please try again.", { id: toastId });
      }
    }
  }, [deleteAssetDisposal, refetchDisposals, refetchAssets, queryClient]);

  // Handle disposal edit
  const handleEditDisposal = useCallback((disposal: ExtendedAssetDisposal) => {
    setDisposalToEdit(disposal);
    setShowEditDisposalDialog(true);
  }, []);

  // Handle edit disposal success
  const handleEditDisposalSuccess = useCallback(() => {
    setShowEditDisposalDialog(false);
    setDisposalToEdit(null);
    refetchDisposals();
    // Also refetch income entries to update the corresponding income entry
    queryClient.invalidateQueries({ queryKey: ["income"] });
    toast.success("Asset disposal updated successfully");
  }, [queryClient, refetchDisposals]);

  // Handle view income entry
  const handleViewIncomeEntry = useCallback((disposal: ExtendedAssetDisposal) => {
    if (disposal.income_entry_id) {
      // Navigate to finance page with income tab and highlight the entry
      router.push(`/finance?tab=income&highlight=${disposal.income_entry_id}`);
    } else {
      toast.error("Income entry not found");
    }
  }, [router]);

  // Ensure we have valid data structures even if queries fail
  const safeAssetsData = useMemo(() => ({
    data: assetsData?.data || [],
    count: assetsData?.count || 0
  }), [assetsData]);

  const safeDisposalsData = useMemo(() => ({
    data: disposalsData?.data || [],
    count: disposalsData?.count || 0
  }), [disposalsData]);

  // Show loading state if any required data is loading
  if (isLoadingAssets && activeTab === "assets") {
    return <AssetManagementSkeleton />;
  }

  if (isLoadingDisposals && activeTab === "disposals") {
    return <AssetManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4 w-full flex overflow-auto">
          <TabsTrigger value="assets" className="flex-1">Add New Assets</TabsTrigger>
          <TabsTrigger value="disposals" className="flex-1">Dispose Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Asset Form */}
            <div className="lg:col-span-1 order-1">
              <Suspense fallback={<AssetFormSkeleton />}>
                <AssetForm
                  onSuccess={() => {
                    refetchAssets();
                    toast.success("Asset added successfully");
                  }}
                />
              </Suspense>
            </div>

            {/* Asset List */}
            <div className="lg:col-span-2 order-2">
              <Suspense fallback={<AssetListSkeleton />}>
                <AssetList
                  assets={safeAssetsData.data}
                  count={safeAssetsData.count}
                  page={assetPage}
                  pageSize={assetPageSize}
                  onPageChange={setAssetPage}
                  onSearch={setAssetSearch}
                  onTypeFilter={setAssetTypeFilter}
                  onStatusFilter={setAssetStatusFilter}
                  onEdit={handleEditAsset}
                  onDelete={handleDeleteAsset}
                  onDispose={handleDisposeAsset}
                  onView={handleViewAsset}
                />
              </Suspense>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="disposals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset Disposal Form */}
            <div className="lg:col-span-1 order-1">
              <Suspense fallback={<AssetFormSkeleton />}>
                <AssetDisposalForm
                  assets={safeAssetsData.data}
                  accounts={accounts || []}
                  onSuccess={() => {
                    refetchDisposals();
                    refetchAssets();
                    toast.success("Asset disposed successfully");
                  }}
                />
              </Suspense>
            </div>

            {/* Asset Disposal List */}
            <div className="lg:col-span-2 order-2">
              <Suspense fallback={<AssetListSkeleton />}>
                <AssetDisposalList
                  disposals={safeDisposalsData.data}
                  count={safeDisposalsData.count}
                  page={disposalPage}
                  pageSize={disposalPageSize}
                  onPageChange={setDisposalPage}
                  onSearch={setDisposalSearch}
                  onDelete={handleDeleteDisposal}
                  onEdit={handleEditDisposal}
                  onViewEntry={handleViewIncomeEntry}
                />
              </Suspense>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Asset Dialog */}
      {showEditDialog && assetToEdit && (
        <AssetForm
          asset={assetToEdit}
          isDialog={true}
          onCancel={() => {
            setShowEditDialog(false);
            setAssetToEdit(null);
          }}
          onSuccess={() => {
            setShowEditDialog(false);
            setAssetToEdit(null);
            refetchAssets();
          }}
        />
      )}

      {/* Dispose Asset Dialog */}
      {showDisposeDialog && assetToDispose && (
        <AssetDisposalForm
          assets={safeAssetsData.data}
          accounts={accounts || []}
          preselectedAsset={assetToDispose}
          isDialog={true}
          onCancel={() => {
            setShowDisposeDialog(false);
            setAssetToDispose(null);
          }}
          onSuccess={() => {
            setShowDisposeDialog(false);
            setAssetToDispose(null);
            refetchDisposals();
            refetchAssets();
          }}
        />
      )}

      {/* Asset Detail View Dialog */}
      {showDetailView && assetToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <AssetDetailView
              assetId={assetToView.id}
              onBack={() => {
                setShowDetailView(false);
                setAssetToView(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Asset Disposal Dialog */}
      {showEditDisposalDialog && disposalToEdit && (
        <AssetDisposalEditForm
          disposal={disposalToEdit}
          accounts={accounts || []}
          onCancel={() => {
            setShowEditDisposalDialog(false);
            setDisposalToEdit(null);
          }}
          onSuccess={handleEditDisposalSuccess}
        />
      )}
    </div>
  );
}
