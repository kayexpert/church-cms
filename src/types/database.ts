export interface DatabaseHealthInfo {
  status: 'healthy' | 'error';
  responseTime: number;
  error?: string;
  timestamp: string;
  connectionCount?: number;
  maxConnections?: number;
  slowQueries?: Array<{query: string, avgTime: number, calls: number}>;
  databaseSize?: string;
  indexUsage?: number;
  cacheHitRatio?: number;
}

export interface StorageInfo {
  buckets: Array<{
    name: string;
    size: number;
    sizeFormatted: string;
    fileCount: number;
  }>;
  totalSize: number;
  totalSizeFormatted: string;
  maxSize: number;
  maxSizeFormatted: string;
  usagePercentage: number;
  growthRate?: {
    monthly: number;
    monthlyFormatted: string;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface DatabaseHealthProps {
  onExport?: () => void;
  onImport?: () => void;
  onReset?: () => void;
  onApplyIndexes?: () => void;
  onOptimizeImages?: () => void;
  isExporting?: boolean;
  isImporting?: boolean;
  isResetting?: boolean;
  isApplyingIndexes?: boolean;
  isOptimizingImages?: boolean;
}
