"use client";

import { useState, useEffect } from "react";
import { ExtendedAsset, AssetType } from "@/types/assets";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format-currency";
import { formatDatabaseDate } from "@/lib/date-utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Building, FileText, CreditCard, ArrowLeft, Tag } from "lucide-react";

interface AssetDetailViewProps {
  assetId: string;
  onBack: () => void;
}

export function AssetDetailView({ assetId, onBack }: AssetDetailViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [asset, setAsset] = useState<ExtendedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssetDetails = async () => {
      try {
        setIsLoading(true);

        // First, fetch the asset
        console.log("Fetching asset with ID:", assetId);
        const { data: assetData, error: assetError } = await supabase
          .from("assets")
          .select("*")
          .eq("id", assetId)
          .single();

        if (assetError) {
          console.error("Supabase asset error:", assetError);
          throw assetError;
        }

        console.log("Asset data received:", assetData);

        if (!assetData) {
          throw new Error("No asset data found");
        }

        // Then, if there's a type_id, fetch the asset type
        let assetTypeData = null;
        if (assetData.type_id) {
          console.log("Fetching asset type with ID:", assetData.type_id);
          const { data: typeData, error: typeError } = await supabase
            .from("asset_types")
            .select("*")
            .eq("id", assetData.type_id)
            .single();

          if (typeError) {
            console.error("Asset type fetch error:", typeError);
            // Don't throw here, just log the error
          } else {
            assetTypeData = typeData;
            console.log("Asset type data received:", assetTypeData);
          }
        }

        // Format the data
        const formattedAsset: ExtendedAsset = {
          ...assetData,
          asset_types: assetTypeData,
        };

        console.log("Formatted asset:", formattedAsset);
        setAsset(formattedAsset);
      } catch (err) {
        console.error("Error fetching asset details:", err);
        setError("Failed to load asset details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetDetails();
  }, [assetId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">{error || "Asset not found"}</p>
              <Button variant="outline" className="mt-4" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'in_repair':
        return <Badge className="bg-yellow-500 text-white">In Repair</Badge>;
      case 'disposed':
        return <Badge className="bg-red-500 text-white">Disposed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Asset Details</h2>
          <p className="text-muted-foreground">
            {asset.asset_types?.name || "Unknown Type"} - {formatDatabaseDate(asset.acquisition_date)}
          </p>
        </div>
      </div>

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{asset.name}</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Acquired on {formatDatabaseDate(asset.acquisition_date)}
                </span>
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(asset.status)}
              <Badge variant="outline" className="text-md px-3 py-1">
                {formatCurrency(asset.acquisition_value)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Asset Name
              </p>
              <p className="text-sm font-semibold">
                {asset.name}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" /> Asset Type
              </p>
              <p className="text-sm font-semibold">
                {asset.asset_types?.name || "Unknown Type"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Acquisition Date
              </p>
              <p className="text-sm font-semibold">
                {formatDatabaseDate(asset.acquisition_date)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Acquisition Value
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(asset.acquisition_value)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Status
              </p>
              <p className="text-sm font-semibold">
                {asset.status.charAt(0).toUpperCase() + asset.status.slice(1).replace('_', ' ')}
              </p>
            </div>

            {asset.description && (
              <div className="col-span-2 space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Description
                </p>
                <p className="text-sm">
                  {asset.description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to List
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
