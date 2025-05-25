// Asset Management Types

import { Account, IncomeEntry } from "./finance";

// Asset Type
export interface AssetType {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Asset
export interface Asset {
  id: string;
  name: string;
  type_id: string;
  type?: AssetType;
  acquisition_date: string;
  acquisition_value: number;
  description?: string;
  status: 'active' | 'in_repair' | 'disposed';
  created_at?: string;
  updated_at?: string;
}

// Asset Disposal
export interface AssetDisposal {
  id: string;
  asset_id: string;
  asset?: Asset;
  disposal_date: string;
  disposal_amount: number;
  account_id: string;
  account?: Account;
  income_entry_id?: string;
  income_entry?: IncomeEntry;
  created_at?: string;
  updated_at?: string;
}

// Form Values
export interface AssetFormValues {
  name: string;
  type_id: string;
  acquisition_date: Date;
  acquisition_value: string;
  description?: string;
  status: 'active' | 'in_repair' | 'disposed';
}

export interface AssetDisposalFormValues {
  asset_id: string;
  disposal_date: Date;
  disposal_amount: string;
  account_id: string;
}

// Extended Asset with type information
export interface ExtendedAsset extends Asset {
  asset_types?: AssetType | null;
}

// Extended Asset Disposal with related information
export interface ExtendedAssetDisposal extends AssetDisposal {
  assets?: Asset | null;
  accounts?: Account | null;
}
