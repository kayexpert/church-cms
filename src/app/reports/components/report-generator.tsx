"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Loader2, Users, DollarSign, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";
import { generateReport } from "@/lib/report-generator";
import { formatDatabaseDate } from "@/lib/date-utils";

// Report type definitions
const MEMBER_REPORTS = {
  'active-members': {
    name: 'Active Members Report',
    description: 'List of all active members in the church',
    requiresDateRange: false,
    requiresYear: false
  },
  'inactive-members': {
    name: 'Inactive Members Report',
    description: 'List of all inactive members in the church',
    requiresDateRange: false,
    requiresYear: false
  },
  'attendance-summary': {
    name: 'Attendance Summary',
    description: 'Member attendance patterns and statistics',
    requiresDateRange: true,
    requiresYear: false
  },
  'absenteeism-report': {
    name: 'Absenteeism Report',
    description: 'Members with high absence rates',
    requiresDateRange: true,
    requiresYear: false
  }
} as const;

const FINANCE_REPORTS = {
  'income-report': {
    name: 'Income Report',
    description: 'Detailed breakdown of all income entries',
    requiresDateRange: true,
    requiresYear: false
  },
  'expenditure-report': {
    name: 'Expenditure Report',
    description: 'Detailed breakdown of all expenditure entries',
    requiresDateRange: true,
    requiresYear: false
  },
  'liabilities-report': {
    name: 'Liabilities Report',
    description: 'Current liabilities status and payment history',
    requiresDateRange: false,
    requiresYear: false
  },
  'assets-report': {
    name: 'Assets Report',
    description: 'Asset inventory and valuation',
    requiresDateRange: false,
    requiresYear: false
  },
  'annual-financial-report': {
    name: 'Annual Financial Report',
    description: 'Comprehensive yearly financial summary',
    requiresDateRange: false,
    requiresYear: true
  }
} as const;

type MemberReportType = keyof typeof MEMBER_REPORTS;
type FinanceReportType = keyof typeof FINANCE_REPORTS;

// Date range presets
const DATE_PRESETS = {
  'current-month': 'Current Month',
  'current-year': 'Current Year',
  'last-month': 'Last Month',
  'last-3-months': 'Last 3 Months',
  'last-6-months': 'Last 6 Months',
  'custom': 'Custom Date Range'
} as const;

type DatePreset = keyof typeof DATE_PRESETS;

// Helper function to get date ranges for presets
const getDateRangeForPreset = (preset: DatePreset): { startDate: Date; endDate: Date } | null => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (preset) {
    case 'current-month':
      return {
        startDate: new Date(currentYear, currentMonth, 1),
        endDate: new Date(currentYear, currentMonth + 1, 0)
      };
    case 'current-year':
      return {
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31)
      };
    case 'last-month':
      return {
        startDate: new Date(currentYear, currentMonth - 1, 1),
        endDate: new Date(currentYear, currentMonth, 0)
      };
    case 'last-3-months':
      return {
        startDate: new Date(currentYear, currentMonth - 3, 1),
        endDate: new Date(currentYear, currentMonth, 0)
      };
    case 'last-6-months':
      return {
        startDate: new Date(currentYear, currentMonth - 6, 1),
        endDate: new Date(currentYear, currentMonth, 0)
      };
    default:
      return null;
  }
};

// Generate year options (current year and 5 years back)
const getYearOptions = () => {
  return Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });
};

export function ReportGenerator() {
  const [activeTab, setActiveTab] = useState<'members' | 'finance'>('members');
  const [selectedMemberReport, setSelectedMemberReport] = useState<MemberReportType | ''>('');
  const [selectedFinanceReport, setSelectedFinanceReport] = useState<FinanceReportType | ''>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('current-month');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Initialize date range on component mount
  useEffect(() => {
    const range = getDateRangeForPreset('current-month');
    if (range) {
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  }, []);

  // Reset preview when report type changes
  useEffect(() => {
    setShowPreview(false);
    setReportData(null);
    setCurrentPage(1); // Reset to first page
  }, [selectedMemberReport, selectedFinanceReport, activeTab]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, datePreset, selectedYear]);

  // Memoized values for performance
  const currentReport = useMemo(() => {
    return activeTab === 'members'
      ? (selectedMemberReport ? MEMBER_REPORTS[selectedMemberReport] : null)
      : (selectedFinanceReport ? FINANCE_REPORTS[selectedFinanceReport] : null);
  }, [activeTab, selectedMemberReport, selectedFinanceReport]);

  const currentReportType = useMemo(() => {
    return activeTab === 'members' ? selectedMemberReport : selectedFinanceReport;
  }, [activeTab, selectedMemberReport, selectedFinanceReport]);

  const yearOptions = useMemo(() => getYearOptions(), []);

  // Optimized handlers with useCallback
  const handleDatePresetChange = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRangeForPreset(preset);
      if (range) {
        setStartDate(range.startDate);
        setEndDate(range.endDate);
      }
    }
  }, []);

  const handleStartDateChange = useCallback((date: Date | null) => {
    setStartDate(date || undefined);
  }, []);

  const handleEndDateChange = useCallback((date: Date | null) => {
    setEndDate(date || undefined);
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    if (!currentReportType) {
      toast.error("Please select a report type");
      return;
    }

    if (!currentReport) return;

    // Validate date range if required
    if (currentReport.requiresDateRange && (!startDate || !endDate)) {
      toast.error("Please select both start and end dates for this report");
      return;
    }

    if (currentReport.requiresDateRange && startDate && endDate && startDate > endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsGenerating(true);

    try {
      // For member reports that don't require date range, don't send date filters unless it's attendance/absenteeism
      const shouldIncludeDateFilters = currentReport.requiresDateRange ||
        (activeTab === 'finance') ||
        (activeTab === 'members' && (currentReportType === 'attendance-summary' || currentReportType === 'absenteeism-report'));

      const filters = {
        startDate: shouldIncludeDateFilters && startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate: shouldIncludeDateFilters && endDate ? endDate.toISOString().split('T')[0] : undefined,
        year: currentReport.requiresYear ? selectedYear : undefined,
        page: currentPage,
        limit: itemsPerPage
      };

      // Fetch real data from API
      const response = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
        body: JSON.stringify({
          reportType: currentReportType,
          filters: {
            ...filters,
            _timestamp: Date.now() // Cache busting
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report preview');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate report preview');
      }

      setReportData(result.data);
      setShowPreview(true);
      toast.success("Report preview generated successfully!");

    } catch (error) {
      console.error('Error generating report preview:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report preview. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [currentReportType, currentReport, startDate, endDate, activeTab, selectedYear, currentPage, itemsPerPage]);

  const handleDownloadReport = useCallback(async () => {
    if (!currentReportType || !reportData) {
      toast.error("Please generate a preview first");
      return;
    }

    try {
      // Use the same logic as preview for date filtering
      const shouldIncludeDateFilters = currentReport?.requiresDateRange ||
        (activeTab === 'finance') ||
        (activeTab === 'members' && (currentReportType === 'attendance-summary' || currentReportType === 'absenteeism-report'));

      const filters = {
        startDate: shouldIncludeDateFilters && startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate: shouldIncludeDateFilters && endDate ? endDate.toISOString().split('T')[0] : undefined,
        year: currentReport?.requiresYear ? selectedYear : undefined
      };

      await generateReport(currentReportType as any, filters);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error("Failed to download report. Please try again.");
    }
  }, [currentReportType, reportData, currentReport, activeTab, startDate, endDate, selectedYear]);

  return (
    <div className="space-y-4 md:space-y-6  md:p-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'members' | 'finance')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="members" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3">
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Members Reports</span>
            <span className="sm:hidden">Members</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Finance Reports</span>
            <span className="sm:hidden">Finance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6 min-h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]">
            {/* Left Panel - Report Configuration */}
            <Card className="lg:col-span-1 h-fit lg:max-h-full overflow-y-auto order-1 lg:order-1">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Membership Reports</CardTitle>
                <CardDescription className="text-sm">
                  Generate and analyze comprehensive reports for your church members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {/* Report Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="member-report-type">Report Type</Label>
                  <Select value={selectedMemberReport} onValueChange={(value) => setSelectedMemberReport(value as MemberReportType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEMBER_REPORTS).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-left">
                          <div className="font-medium text-left">{config.name}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Preset Selection - Always show */}
                {selectedMemberReport && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="date-preset">Date Range</Label>
                      <Select value={datePreset} onValueChange={(value) => handleDatePresetChange(value as DatePreset)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DATE_PRESETS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Date Range (conditional) */}
                    {datePreset === 'custom' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Start Date</Label>
                          <DatePicker
                            value={startDate}
                            onChange={handleStartDateChange}
                            placeholder="Select start date"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">End Date</Label>
                          <DatePicker
                            value={endDate}
                            onChange={handleEndDateChange}
                            placeholder="Select end date"
                          />
                        </div>
                      </div>
                    )}

                    {/* Date Range Display */}
                    {datePreset !== 'custom' && startDate && endDate && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Year Selection (conditional) */}
                {selectedMemberReport && MEMBER_REPORTS[selectedMemberReport]?.requiresYear && (
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Generate Preview Button */}
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!selectedMemberReport || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Generate Preview
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right Panel - Report Preview */}
            <Card className="lg:col-span-2 flex flex-col h-auto lg:h-full min-h-[400px] order-2 lg:order-2">
              <CardHeader className="flex-shrink-0 pb-3 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Eye className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="truncate">
                    Report - {selectedMemberReport ? MEMBER_REPORTS[selectedMemberReport].name : 'Members'} {new Date().getFullYear()}
                  </span>
                </CardTitle>
                {showPreview && reportData && (
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleDownloadReport} size="sm" className="text-xs md:text-sm">
                      <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Download PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
                {showPreview && reportData ? (
                  <div className="space-y-4">
                    {/* Report Summary */}
                    <div className="p-3 md:p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2 text-sm md:text-base">Report Summary</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                        <div>
                          <span className="font-medium">Report Type:</span>
                          <p className="text-muted-foreground break-words">{reportData.reportType}</p>
                        </div>
                        <div>
                          <span className="font-medium">Total Records:</span>
                          <p className="text-muted-foreground">{reportData.totalRecords}</p>
                        </div>
                        <div>
                          <span className="font-medium">Date Range:</span>
                          <p className="text-muted-foreground text-xs md:text-sm">
                            {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Generated:</span>
                          <p className="text-muted-foreground text-xs md:text-sm">
                            {new Date(reportData.generatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {reportData.summary && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="font-medium">Summary:</span>
                          <p className="text-muted-foreground mt-1">{reportData.summary}</p>
                        </div>
                      )}
                    </div>

                    {/* Report Content Preview */}
                    <div className="border rounded-lg p-3 md:p-4">
                      <h4 className="font-semibold mb-3 text-sm md:text-base">Report Preview</h4>

                      {/* Mobile-responsive table container */}
                      <div className="overflow-x-auto">
                        <div className="min-w-full inline-block align-middle">
                          {/* Column Headers */}
                          {reportData.columns && reportData.columns.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 p-2 bg-muted/30 rounded text-xs md:text-sm font-medium mb-2 min-w-[600px] md:min-w-0">
                              {reportData.columns.slice(0, 4).map((column: string, index: number) => (
                                <div key={index} className="truncate px-1">{column}</div>
                              ))}
                            </div>
                          )}

                          {/* Data Rows */}
                          <div className="space-y-2">
                            {reportData.data && reportData.data.length > 0 ? (
                              reportData.data.map((record: any, i: number) => (
                                <div key={i} className="grid grid-cols-4 gap-2 p-2 bg-muted/50 rounded text-xs md:text-sm min-w-[600px] md:min-w-0">
                                  {activeTab === 'members' ? (
                                    // Handle different member report types
                                    selectedMemberReport === 'attendance-summary' || selectedMemberReport === 'absenteeism-report' ? (
                                      <>
                                        <div className="truncate px-1">{record.member_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'N/A'}</div>
                                        <div className="truncate px-1">{record.total_events !== undefined ? record.total_events : (record.total_attendance || record.attendance_count || 'N/A')}</div>
                                        <div className="truncate px-1">{record.attendance_rate !== undefined ? `${record.attendance_rate}%` : 'N/A'}</div>
                                        <div className="truncate px-1">{record.last_attendance ? formatDatabaseDate(record.last_attendance) : 'Never'}</div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="truncate px-1">{record.first_name} {record.last_name}</div>
                                        <div className="truncate px-1">{record.email || 'N/A'}</div>
                                        <div className="truncate px-1">{record.phone || 'N/A'}</div>
                                        <div className="truncate px-1">{record.join_date ? formatDatabaseDate(record.join_date) : 'N/A'}</div>
                                      </>
                                    )
                                  ) : (
                                    <>
                                      <div className="truncate px-1">{record.date ? formatDatabaseDate(record.date) : 'N/A'}</div>
                                      <div className="truncate px-1">{record.description || 'N/A'}</div>
                                      <div className="truncate px-1">{record.category_name || 'N/A'}</div>
                                      <div className="truncate px-1">${record.amount?.toLocaleString() || '0'}</div>
                                    </>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center text-muted-foreground py-4 text-sm">
                                No data available for the selected criteria
                              </div>
                            )}

                            {/* Pagination Controls */}
                            {reportData.pagination && reportData.pagination.totalPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t gap-3 sm:gap-0">
                                <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
                                  Showing {((reportData.pagination.currentPage - 1) * reportData.pagination.itemsPerPage) + 1} to{' '}
                                  {Math.min(reportData.pagination.currentPage * reportData.pagination.itemsPerPage, reportData.totalRecords)} of{' '}
                                  {reportData.totalRecords} records
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentPage(currentPage - 1);
                                      handleGeneratePreview();
                                    }}
                                    disabled={!reportData.pagination.hasPrevPage || isGenerating}
                                    className="text-xs md:text-sm px-2 md:px-3"
                                  >
                                    <span className="hidden sm:inline">Previous</span>
                                    <span className="sm:hidden">Prev</span>
                                  </Button>
                                  <span className="text-xs md:text-sm whitespace-nowrap">
                                    Page {reportData.pagination.currentPage} of {reportData.pagination.totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentPage(currentPage + 1);
                                      handleGeneratePreview();
                                    }}
                                    disabled={!reportData.pagination.hasNextPage || isGenerating}
                                    className="text-xs md:text-sm px-2 md:px-3"
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select options to generate a report</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6 min-h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]">
            {/* Left Panel - Report Configuration */}
            <Card className="lg:col-span-1 h-fit lg:max-h-full overflow-y-auto order-1 lg:order-1">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Finance Reports</CardTitle>
                <CardDescription className="text-sm">
                  Generate and analyze comprehensive financial reports for your church
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {/* Report Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="finance-report-type">Report Type</Label>
                  <Select value={selectedFinanceReport} onValueChange={(value) => setSelectedFinanceReport(value as FinanceReportType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FINANCE_REPORTS).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-left">
                          <div className="font-medium text-left">{config.name}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Preset Selection - Always show */}
                {selectedFinanceReport && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="date-preset">Date Range</Label>
                      <Select value={datePreset} onValueChange={(value) => handleDatePresetChange(value as DatePreset)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DATE_PRESETS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Date Range (conditional) */}
                    {datePreset === 'custom' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Start Date</Label>
                          <DatePicker
                            value={startDate}
                            onChange={handleStartDateChange}
                            placeholder="Select start date"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">End Date</Label>
                          <DatePicker
                            value={endDate}
                            onChange={handleEndDateChange}
                            placeholder="Select end date"
                          />
                        </div>
                      </div>
                    )}

                    {/* Date Range Display */}
                    {datePreset !== 'custom' && startDate && endDate && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Year Selection (conditional) */}
                {selectedFinanceReport && FINANCE_REPORTS[selectedFinanceReport]?.requiresYear && (
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Generate Preview Button */}
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!selectedFinanceReport || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Generate Preview
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right Panel - Report Preview */}
            <Card className="lg:col-span-2 flex flex-col h-auto lg:h-full min-h-[400px] order-2 lg:order-2">
              <CardHeader className="flex-shrink-0 pb-3 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Eye className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="truncate">
                    Report - {selectedFinanceReport ? FINANCE_REPORTS[selectedFinanceReport].name : 'Finance'} {new Date().getFullYear()}
                  </span>
                </CardTitle>
                {showPreview && reportData && (
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleDownloadReport} size="sm" className="text-xs md:text-sm">
                      <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Download PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
                {showPreview && reportData ? (
                  <div className="space-y-4">
                    {/* Report Summary */}
                    <div className="p-3 md:p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2 text-sm md:text-base">Report Summary</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                        <div>
                          <span className="font-medium">Report Type:</span>
                          <p className="text-muted-foreground break-words">{reportData.reportType}</p>
                        </div>
                        <div>
                          <span className="font-medium">Total Records:</span>
                          <p className="text-muted-foreground">{reportData.totalRecords}</p>
                        </div>
                        <div>
                          <span className="font-medium">Date Range:</span>
                          <p className="text-muted-foreground text-xs md:text-sm">
                            {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Generated:</span>
                          <p className="text-muted-foreground text-xs md:text-sm">
                            {new Date(reportData.generatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {reportData.summary && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="font-medium">Summary:</span>
                          <p className="text-muted-foreground mt-1">{reportData.summary}</p>
                        </div>
                      )}
                    </div>

                    {/* Report Content Preview */}
                    <div className="border rounded-lg p-3 md:p-4">
                      <h4 className="font-semibold mb-3 text-sm md:text-base">Report Preview</h4>

                      {/* Mobile-responsive table container */}
                      <div className="overflow-x-auto">
                        <div className="min-w-full inline-block align-middle">
                          {/* Column Headers */}
                          {reportData.columns && reportData.columns.length > 0 && (
                            <div className={`grid gap-2 p-2 bg-muted/30 rounded text-xs md:text-sm font-medium mb-2 ${
                              selectedFinanceReport === 'liabilities-report' ? 'grid-cols-6 min-w-[800px] md:min-w-0' :
                              selectedFinanceReport === 'annual-financial-report' ? 'grid-cols-5 min-w-[700px] md:min-w-0' :
                              'grid-cols-4 min-w-[600px] md:min-w-0'
                            }`}>
                              {(selectedFinanceReport === 'liabilities-report' ? reportData.columns :
                                selectedFinanceReport === 'annual-financial-report' ? reportData.columns :
                                reportData.columns.slice(0, 4)).map((column: string, index: number) => (
                                <div key={index} className="truncate px-1">{column}</div>
                              ))}
                            </div>
                          )}

                          {/* Data Rows */}
                          <div className="space-y-2">
                            {reportData.data && reportData.data.length > 0 ? (
                              reportData.data.map((record: any, i: number) => (
                                <div key={i} className={`grid gap-2 p-2 bg-muted/50 rounded text-xs md:text-sm ${
                                  selectedFinanceReport === 'liabilities-report' ? 'grid-cols-6 min-w-[800px] md:min-w-0' :
                                  selectedFinanceReport === 'annual-financial-report' ? 'grid-cols-5 min-w-[700px] md:min-w-0' :
                                  'grid-cols-4 min-w-[600px] md:min-w-0'
                                }`}>
                                  {activeTab === 'members' ? (
                                    // Handle different member report types
                                    selectedMemberReport === 'attendance-summary' || selectedMemberReport === 'absenteeism-report' ? (
                                      <>
                                        <div className="truncate px-1">{record.member_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'N/A'}</div>
                                        <div className="truncate px-1">{record.total_events !== undefined ? record.total_events : (record.total_attendance || record.attendance_count || 'N/A')}</div>
                                        <div className="truncate px-1">{record.attendance_rate !== undefined ? `${record.attendance_rate}%` : 'N/A'}</div>
                                        <div className="truncate px-1">{record.last_attendance ? formatDatabaseDate(record.last_attendance) : 'Never'}</div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="truncate px-1">{record.first_name} {record.last_name}</div>
                                        <div className="truncate px-1">{record.email || 'N/A'}</div>
                                        <div className="truncate px-1">{record.phone || 'N/A'}</div>
                                        <div className="truncate px-1">{record.join_date ? formatDatabaseDate(record.join_date) : 'N/A'}</div>
                                      </>
                                    )
                                  ) : selectedFinanceReport === 'liabilities-report' ? (
                                    // Special handling for liability reports
                                    <>
                                      <div className="truncate px-1">{record.date ? formatDatabaseDate(record.date) : 'N/A'}</div>
                                      <div className="truncate px-1">{record.creditor_name || 'N/A'}</div>
                                      <div className="truncate px-1">{record.category_name || 'N/A'}</div>
                                      <div className="truncate px-1">${record.total_amount?.toLocaleString() || '0'}</div>
                                      <div className="truncate px-1">${record.amount_remaining?.toLocaleString() || '0'}</div>
                                      <div className="truncate px-1">
                                        {record.status && (
                                          <span className={`px-1 md:px-2 py-1 rounded-full text-xs font-medium ${
                                            record.status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                                            record.status === 'partial' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                            'bg-red-100 text-red-800 border-red-200'
                                          }`}>
                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  ) : selectedFinanceReport === 'annual-financial-report' ? (
                                    // Special handling for annual financial report
                                    <>
                                      <div className="truncate px-1">${record.totalIncome?.toLocaleString() || '0'}</div>
                                      <div className="truncate px-1">${record.totalExpenditure?.toLocaleString() || '0'}</div>
                                      <div className="truncate px-1">${record.netIncome?.toLocaleString() || '0'}</div>
                                      <div className="truncate px-1">${record.totalAssets?.toLocaleString() || '0'}</div>
                                      <div className="truncate px-1">${record.totalLiabilities?.toLocaleString() || '0'}</div>
                                    </>
                                  ) : (
                                    // Other finance reports
                                    <>
                                      <div className="truncate px-1">{record.date ? formatDatabaseDate(record.date) : 'N/A'}</div>
                                      <div className="truncate px-1">{record.description || 'N/A'}</div>
                                      <div className="truncate px-1">{record.category_name || 'N/A'}</div>
                                      <div className="truncate px-1">${record.amount?.toLocaleString() || '0'}</div>
                                    </>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center text-muted-foreground py-4 text-sm">
                                No data available for the selected criteria
                              </div>
                            )}

                            {/* Pagination Controls */}
                            {reportData.pagination && reportData.pagination.totalPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t gap-3 sm:gap-0">
                                <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
                                  Showing {((reportData.pagination.currentPage - 1) * reportData.pagination.itemsPerPage) + 1} to{' '}
                                  {Math.min(reportData.pagination.currentPage * reportData.pagination.itemsPerPage, reportData.totalRecords)} of{' '}
                                  {reportData.totalRecords} records
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentPage(currentPage - 1);
                                      handleGeneratePreview();
                                    }}
                                    disabled={!reportData.pagination.hasPrevPage || isGenerating}
                                    className="text-xs md:text-sm px-2 md:px-3"
                                  >
                                    <span className="hidden sm:inline">Previous</span>
                                    <span className="sm:hidden">Prev</span>
                                  </Button>
                                  <span className="text-xs md:text-sm whitespace-nowrap">
                                    Page {reportData.pagination.currentPage} of {reportData.pagination.totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentPage(currentPage + 1);
                                      handleGeneratePreview();
                                    }}
                                    disabled={!reportData.pagination.hasNextPage || isGenerating}
                                    className="text-xs md:text-sm px-2 md:px-3"
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select options to generate a report</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
