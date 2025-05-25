import { supabase } from '@/lib/supabase';
import { checkFunctionExists, markFunctionExists } from '@/lib/db-utils';
import {
  Member,
  Department,
  Certificate,
  CovenantFamily,
  MemberStats,
  DistributionData
} from '@/types/member';
import { ServiceResponse, PaginatedResponse } from '@/types/common';

// Cache for member count to reduce database load
const memberCountCache = {
  timestamp: 0,
  count: 0,
  ttl: 60000, // 1 minute TTL
};

/**
 * Get all members with optional filtering and pagination
 * Optimized with caching and efficient query building
 */
export async function getMembers(options?: {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResponse<PaginatedResponse<Member>>> {
  try {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20; // Default to 20 items per page
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    // Build query for data
    let dataQuery = supabase.from('members').select('*');
    let countQuery = supabase.from('members').select('id', { count: 'exact', head: true });

    // Apply filters to both queries
    if (options?.status && options.status !== 'all') {
      dataQuery = dataQuery.eq('status', options.status);
      countQuery = countQuery.eq('status', options.status);
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      const searchFilter = `or(first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},primary_phone_number.ilike.${searchTerm})`;
      dataQuery = dataQuery.or(searchFilter);
      countQuery = countQuery.or(searchFilter);
    }

    // Apply pagination and ordering to data query
    dataQuery = dataQuery
      .order('first_name', { ascending: true })
      .range(start, end);

    // Use cached count for unfiltered queries to improve performance
    let countResult;
    if (!options?.status && !options?.search && memberCountCache.timestamp > Date.now() - memberCountCache.ttl) {
      countResult = { count: memberCountCache.count, error: null };
    } else {
      countResult = await countQuery;

      // Update cache if this was an unfiltered query
      if (!options?.status && !options?.search && !countResult.error) {
        memberCountCache.count = countResult.count || 0;
        memberCountCache.timestamp = Date.now();
      }
    }

    // Execute data query
    const dataResult = await dataQuery;

    // Handle errors
    if (countResult.error) {
      return { data: null, error: countResult.error };
    }

    if (dataResult.error) {
      return { data: null, error: dataResult.error };
    }

    // Return the combined result
    return {
      data: {
        data: dataResult.data || [],
        count: countResult.count || 0
      },
      error: null
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single member by ID
 * Optimized with proper error handling and data processing
 */
export async function getMemberById(id: string): Promise<ServiceResponse<Member>> {
  try {
    // Get the member data with related departments and certificates
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        member_departments(department_id),
        member_certificates(certificate_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Process the nested data structure
    if (data) {
      // Extract department IDs from the nested structure
      if (data.member_departments && Array.isArray(data.member_departments)) {
        data.departments = data.member_departments
          .filter(dept => dept && dept.department_id)
          .map(dept => dept.department_id);
      } else {
        // Ensure departments is always an array
        data.departments = [];
      }

      // Extract certificate IDs from the nested structure
      if (data.member_certificates && Array.isArray(data.member_certificates)) {
        data.certificates = data.member_certificates
          .filter(cert => cert && cert.certificate_id)
          .map(cert => cert.certificate_id);
      } else {
        // Ensure certificates is always an array
        data.certificates = [];
      }
    }

    return { data, error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Add a new member
 */
export async function addMember(member: Omit<Member, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<Member>> {
  try {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error adding member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing member
 */
export async function updateMember(id: string, member: Partial<Member>): Promise<ServiceResponse<Member>> {
  try {
    const { data, error } = await supabase
      .from('members')
      .update(member)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a member
 */
export async function deleteMember(id: string): Promise<ServiceResponse<null>> {
  try {
    // First, get the member to retrieve the profile image URL
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('profile_image')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`Error fetching member ${id} for deletion:`, fetchError);
      // Continue with deletion even if we can't fetch the member
    } else if (member?.profile_image) {
      // If the member has a profile image, delete it from storage
      try {
        const { deleteStorageFile } = await import('./storage-delete-service');
        await deleteStorageFile(member.profile_image);
        console.log(`Deleted profile image for member ${id}: ${member.profile_image}`);
      } catch (imageError) {
        console.error(`Error deleting profile image for member ${id}:`, imageError);
        // Continue with member deletion even if image deletion fails
      }
    }

    // Delete the member from the database
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    return { data: null, error };
  } catch (error) {
    console.error('Error deleting member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all departments
 */
export async function getDepartments(): Promise<ServiceResponse<Department[]>> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*');

    return { data, error };
  } catch (error) {
    console.error('Error fetching departments:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all certificates
 */
export async function getCertificates(): Promise<ServiceResponse<Certificate[]>> {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*');

    return { data, error };
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all covenant families
 */
export async function getCovenantFamilies(): Promise<ServiceResponse<CovenantFamily[]>> {
  try {
    const { data, error } = await supabase
      .from('covenant_families')
      .select('*');

    return { data, error };
  } catch (error) {
    console.error('Error fetching covenant families:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get member departments
 */
export async function getMemberDepartments(memberId: string): Promise<ServiceResponse<string[]>> {
  try {
    const { data, error } = await supabase
      .from('member_departments')
      .select('department_id')
      .eq('member_id', memberId);

    const departmentIds = data?.map(item => item.department_id) || [];

    return { data: departmentIds, error };
  } catch (error) {
    console.error('Error fetching member departments:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update member departments
 * Optimized with transaction-like pattern and reduced logging
 */
export async function updateMemberDepartments(memberId: string, departmentIds: string[]): Promise<ServiceResponse<null>> {
  try {
    // First delete existing associations
    const { error: deleteError } = await supabase
      .from('member_departments')
      .delete()
      .eq('member_id', memberId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    // Then insert new associations if there are any
    if (departmentIds.length > 0) {
      const departmentRecords = departmentIds.map(departmentId => ({
        member_id: memberId,
        department_id: departmentId
      }));

      const { error: insertError } = await supabase
        .from('member_departments')
        .insert(departmentRecords);

      if (insertError) {
        return { data: null, error: insertError };
      }
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get member certificates
 */
export async function getMemberCertificates(memberId: string): Promise<ServiceResponse<string[]>> {
  try {
    const { data, error } = await supabase
      .from('member_certificates')
      .select('certificate_id')
      .eq('member_id', memberId);

    const certificateIds = data?.map(item => item.certificate_id) || [];

    return { data: certificateIds, error };
  } catch (error) {
    console.error('Error fetching member certificates:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update member certificates
 * Optimized with transaction-like pattern and reduced logging
 */
export async function updateMemberCertificates(memberId: string, certificateIds: string[]): Promise<ServiceResponse<null>> {
  try {
    // First delete existing associations
    const { error: deleteError } = await supabase
      .from('member_certificates')
      .delete()
      .eq('member_id', memberId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    // Then insert new associations if there are any
    if (certificateIds.length > 0) {
      const certificateRecords = certificateIds.map(certificateId => ({
        member_id: memberId,
        certificate_id: certificateId,
        issue_date: new Date().toISOString().split('T')[0]
      }));

      const { error: insertError } = await supabase
        .from('member_certificates')
        .insert(certificateRecords);

      if (insertError) {
        return { data: null, error: insertError };
      }
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Upload member profile image with optimization
 */
export async function uploadMemberImage(file: File, memberId: string): Promise<ServiceResponse<string>> {
  try {
    // First, check if the member already has a profile image
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('profile_image')
      .eq('id', memberId)
      .single();

    // Store the old image URL for deletion after successful upload
    const oldImageUrl = member?.profile_image;

    // Try to optimize the image before uploading
    let fileToUpload = file;

    try {
      // Import the image optimization utilities dynamically (client-side only)
      const { resizeAndOptimizeImage, getBestSupportedImageFormat } = await import('@/lib/image-utils');

      // Get the best supported image format
      const bestFormat = typeof window !== 'undefined' ? getBestSupportedImageFormat() : 'image/webp';

      // Determine file extension based on format
      const fileExt = bestFormat === 'image/webp' ? 'webp' : 'jpg';

      // Resize and optimize the image before upload (max width 400px)
      const optimizedImage = await resizeAndOptimizeImage(
        file,
        400,  // maxWidth
        0.85, // quality
        bestFormat // format
      );

      // Create a new File object from the optimized blob
      fileToUpload = new File(
        [optimizedImage],
        file.name.replace(/\.[^/.]+$/, `.${fileExt}`),
        { type: bestFormat }
      );

      console.log(`Image optimized: Original size: ${file.size / 1024}KB, Optimized size: ${fileToUpload.size / 1024}KB, Format: ${bestFormat}`);
    } catch (optimizationError) {
      // If optimization fails, use the original file
      console.warn('Image optimization failed, using original file:', optimizationError);
    }

    // Use the server-side API to upload the file with admin privileges
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('memberId', memberId);
    formData.append('bucketName', 'members');

    console.log(`Uploading file for member ${memberId} via API`);
    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Upload error via API:', result.error);
      return {
        data: null,
        error: new Error(result.error || 'Failed to upload image')
      };
    }

    console.log('Image uploaded successfully:', result.url);

    // If upload was successful and there was an old image, delete it
    if (oldImageUrl) {
      try {
        const { deleteStorageFile } = await import('./storage-delete-service');
        await deleteStorageFile(oldImageUrl);
        console.log(`Deleted old profile image for member ${memberId}: ${oldImageUrl}`);
      } catch (deleteError) {
        console.error(`Error deleting old profile image for member ${memberId}:`, deleteError);
        // Continue even if deletion fails
      }
    }

    return { data: result.url, error: null };
  } catch (error) {
    console.error('Unexpected error uploading member image:', error);
    return {
      data: null,
      error: new Error(`Unexpected error uploading image: ${(error as Error).message}`)
    };
  }
}

/**
 * Get dashboard statistics
 */
export async function getMemberStats(): Promise<ServiceResponse<MemberStats>> {
  try {
    console.log('Fetching member stats...');

    // Always use the direct query approach for more reliable results
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();

    console.log('First day of current month:', firstDayOfMonth);

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, status, created_at')
      .order('id', { ascending: true }); // Add ordering to ensure consistent results

    if (membersError) {
      console.error('Error in member stats query:', membersError);
      return { data: null, error: membersError };
    }

    console.log(`Retrieved ${members.length} members for stats calculation`);

    // Calculate stats on the client side
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = members.filter(m => m.status === 'inactive').length;
    const newMembersThisMonth = members.filter(m => m.created_at >= firstDayOfMonth).length;

    const stats = {
      totalMembers,
      activeMembers,
      inactiveMembers,
      newMembersThisMonth
    };

    console.log('Calculated member stats:', stats);

    return {
      data: stats,
      error: null
    };
  } catch (error) {
    console.error('Error fetching member stats:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get members with upcoming birthdays
 */
export async function getUpcomingBirthdays(days: number = 30): Promise<ServiceResponse<Member[]>> {
  try {
    // Skip RPC approach entirely due to authentication issues
    console.log('Using client-side approach for fetching upcoming birthdays');

    // Mark the function as non-existent to avoid future calls
    if (typeof window !== 'undefined') {
      localStorage.setItem('rpc_get_upcoming_birthdays_exists', 'false');
    }

    // Use the client-side implementation
    return getUpcomingBirthdaysClientSide(days);
  } catch (error) {
    console.error('Unexpected error in getUpcomingBirthdays:', error);
    return getUpcomingBirthdaysClientSide(days);
  }
}

/**
 * Fallback function to get upcoming birthdays using client-side filtering
 * This is used if the RPC function doesn't exist yet
 */
async function getUpcomingBirthdaysClientSide(days: number = 30): Promise<ServiceResponse<Member[]>> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .not('date_of_birth', 'is', null);

    if (error) {
      return { data: null, error };
    }

    // Filter members with birthdays in the next 'days' days
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const upcomingBirthdays = data
      .filter(member => {
        if (!member.date_of_birth) return false;

        const birthDate = new Date(member.date_of_birth);
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();

        // Create dates for this year's birthday and next year's birthday
        const thisYearBirthday = new Date(currentYear, birthMonth, birthDay);
        const nextYearBirthday = new Date(currentYear + 1, birthMonth, birthDay);

        // Calculate days until birthday
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysUntilThisYear = Math.ceil((thisYearBirthday.getTime() - currentDate.getTime()) / msPerDay);
        const daysUntilNextYear = Math.ceil((nextYearBirthday.getTime() - currentDate.getTime()) / msPerDay);

        // Use this year's birthday if it's in the future, otherwise use next year's
        const daysUntil = daysUntilThisYear >= 0 ? daysUntilThisYear : daysUntilNextYear;

        // Add days_until property for sorting
        (member as any).days_until = daysUntil;

        // Return true if birthday is within the specified days
        return daysUntil >= 0 && daysUntil <= days;
      })
      .sort((a, b) => (a as any).days_until - (b as any).days_until);

    return { data: upcomingBirthdays, error: null };
  } catch (error) {
    console.error('Error fetching upcoming birthdays (client-side):', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get gender distribution
 */
export async function getGenderDistribution(): Promise<ServiceResponse<DistributionData[]>> {
  try {
    console.log('Fetching gender distribution data...');

    // Skip RPC approach entirely for more reliable results
    console.log('Using direct query approach for gender distribution');

    // Always use the direct query approach for more reliable results
    const { data, error } = await supabase
      .from('members')
      .select('gender')
      .order('id', { ascending: true }); // Add ordering to ensure consistent results

    if (error) {
      console.error('Error in gender distribution query:', error);
      return { data: null, error };
    }

    console.log(`Retrieved ${data.length} members for gender distribution`);

    // Count the distribution on the client side
    const counts = {
      male: 0,
      female: 0,
      other: 0
    };

    data.forEach(member => {
      if (!member.gender) {
        // Skip null/undefined gender
      } else if (member.gender.toLowerCase() === 'male') {
        counts.male++;
      } else if (member.gender.toLowerCase() === 'female') {
        counts.female++;
      } else {
        counts.other++;
      }
    });

    console.log('Gender distribution counts:', counts);

    const result = [
      { name: 'Male', value: counts.male },
      { name: 'Female', value: counts.female },
      { name: 'Other', value: counts.other }
    ];

    console.log('Final gender distribution data:', result);

    return {
      data: result,
      error: null
    };
  } catch (error) {
    console.error('Error fetching gender distribution:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get department distribution
 */
export async function getDepartmentDistribution(): Promise<ServiceResponse<DistributionData[]>> {
  try {
    // Check if the RPC function exists using our utility function
    const functionName = 'get_department_distribution';
    const rpcFunctionExists = await checkFunctionExists(functionName);

    if (rpcFunctionExists) {
      // Try the more efficient approach using SQL RPC function
      try {
        const { data, error } = await supabase.rpc(functionName);

        if (error && error.message.includes(`function "${functionName}" does not exist`)) {
          // Remember that the function doesn't exist to avoid future calls
          markFunctionExists(functionName, false);
        } else if (!error && data) {
          return { data, error: null };
        }
      } catch (rpcError) {
        console.warn('RPC function get_department_distribution failed, falling back to join query', rpcError);
      }
    }

    // Fallback to a more efficient join query
    const { data, error } = await supabase
      .from('departments')
      .select(`
        id,
        name,
        member_departments(member_id)
      `);

    if (error) {
      return { data: null, error };
    }

    // Process the results on the client side
    const departmentCounts = data.map(dept => ({
      name: dept.name,
      value: dept.member_departments ? dept.member_departments.length : 0
    }));

    return { data: departmentCounts, error: null };
  } catch (error) {
    console.error('Error fetching department distribution:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get member status distribution
 */
export async function getStatusDistribution(): Promise<ServiceResponse<DistributionData[]>> {
  try {
    console.log('Fetching status distribution data...');

    // Skip RPC approach entirely for more reliable results
    console.log('Using direct query approach for status distribution');

    // Always use the direct query approach for more reliable results
    const { data, error } = await supabase
      .from('members')
      .select('status')
      .order('id', { ascending: true }); // Add ordering to ensure consistent results

    if (error) {
      console.error('Error in status distribution query:', error);
      return { data: null, error };
    }

    console.log(`Retrieved ${data.length} members for status distribution`);

    // Count the distribution on the client side
    const counts = {
      active: 0,
      inactive: 0,
      unknown: 0
    };

    data.forEach(member => {
      if (!member.status) {
        counts.unknown++;
      } else if (member.status === 'active') {
        counts.active++;
      } else if (member.status === 'inactive') {
        counts.inactive++;
      } else {
        counts.unknown++;
      }
    });

    console.log('Status distribution counts:', counts);

    const result = [
      { name: 'Active', value: counts.active },
      { name: 'Inactive', value: counts.inactive },
      ...(counts.unknown > 0 ? [{ name: 'Unknown', value: counts.unknown }] : [])
    ];

    console.log('Final status distribution data:', result);

    return {
      data: result,
      error: null
    };
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get member growth data for the last 6 months
 */
export async function getMemberGrowth(): Promise<ServiceResponse<{ month: string; members: number }[]>> {
  try {
    // Check if the RPC function exists using our utility function
    const functionName = 'get_member_growth';
    const rpcFunctionExists = await checkFunctionExists(functionName);

    if (rpcFunctionExists) {
      // Try the more efficient approach using SQL RPC function
      try {
        console.log('Calling RPC function:', functionName);
        const { data, error } = await supabase.rpc(functionName);
        console.log('RPC function response:', { data, error });

        if (error && error.message.includes(`function "${functionName}" does not exist`)) {
          // Remember that the function doesn't exist to avoid future calls
          markFunctionExists(functionName, false);
          console.log('Function does not exist, marking as non-existent');
        } else if (!error && data) {
          // Transform the data to match the expected format
          console.log('Raw data from RPC function:', data);
          const formattedData = data.map((item: { month_year: string; members: string | number }) => ({
            month: item.month_year,
            members: Number(item.members)
          }));
          console.log('Formatted data:', formattedData);

          // Data is already in chronological order (oldest to newest) from SQL function
          return { data: formattedData, error: null };
        }
      } catch (rpcError) {
        console.warn('RPC function get_member_growth failed, falling back to client-side calculation', rpcError);
      }
    }

    // Fallback to client-side calculation
    console.log('Falling back to client-side calculation');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('created_at');

    console.log('Members query result:', { count: members?.length, error: membersError });

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return { data: null, error: membersError };
    }

    // Calculate the growth data on the client side
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const growthData = [];

    // Generate the last 6 months in chronological order (oldest first)
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentYear, currentMonth - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      const monthYear = month.toLocaleString('default', { year: '2-digit' });

      // Format like "Jan '23"
      const monthLabel = `${monthName} '${monthYear}`;

      // Count members who joined in this month
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const newMembers = members.filter(member => {
        // Use created_at as the date when the member was added
        if (!member.created_at) return false;

        const joinDate = new Date(member.created_at);
        return joinDate >= monthStart && joinDate <= monthEnd;
      }).length;

      growthData.push({
        month: monthLabel,
        members: newMembers
      });
    }

    console.log('Final growth data from client-side calculation:', growthData);
    return { data: growthData, error: null };
  } catch (error) {
    console.error('Error fetching member growth data:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get count of birthdays in the current month
 */
export async function getBirthdaysThisMonth(): Promise<ServiceResponse<number>> {
  try {
    // Skip RPC approach entirely due to authentication issues
    console.log('Using standard query approach for fetching birthdays this month');

    // Mark the function as non-existent to avoid future calls
    markFunctionExists('get_birthdays_this_month', false);

    // Fallback to client-side calculation
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('date_of_birth')
      .not('date_of_birth', 'is', null);

    if (membersError) {
      return { data: null, error: membersError };
    }

    // Count members with birthdays in the current month
    const birthdaysThisMonth = members.filter(member => {
      if (!member.date_of_birth) return false;
      const birthMonth = new Date(member.date_of_birth).getMonth() + 1;
      return birthMonth === currentMonth;
    }).length;

    return { data: birthdaysThisMonth, error: null };
  } catch (error) {
    console.error('Error fetching birthdays this month:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get attendance trend data for the last 6 months
 */
export async function getAttendanceTrend(): Promise<ServiceResponse<{ month: string; rate: number }[]>> {
  try {
    // Check if the RPC function exists using our utility function
    const functionName = 'get_attendance_trend';
    const rpcFunctionExists = await checkFunctionExists(functionName);

    if (rpcFunctionExists) {
      // Try the more efficient approach using SQL RPC function
      try {
        const { data, error } = await supabase.rpc(functionName);

        if (error && error.message.includes(`function "${functionName}" does not exist`)) {
          // Remember that the function doesn't exist to avoid future calls
          markFunctionExists(functionName, false);
        } else if (!error && data) {
          // Transform the data to match the expected format
          const formattedData = data.map((item: { month_year: string; attendance_rate: string | number }) => ({
            month: item.month_year,
            rate: Number(item.attendance_rate)
          }));

          // Reverse the array to get chronological order (oldest to newest)
          return { data: formattedData.reverse(), error: null };
        }
      } catch (rpcError) {
        console.warn('RPC function get_attendance_trend failed, falling back to client-side calculation', rpcError);
      }
    }

    // Fallback to client-side calculation
    // First, get all active members count
    const { data: activeMembers, error: membersError } = await supabase
      .from('members')
      .select('id')
      .eq('status', 'active');

    if (membersError) {
      return { data: null, error: membersError };
    }

    const totalActiveMembers = activeMembers.length;

    // If no active members, return zero rates
    if (totalActiveMembers === 0) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      const trendData = [];

      // Generate the last 6 months with zero rates
      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentYear, currentMonth - i, 1);
        const monthName = month.toLocaleString('default', { month: 'short' });
        const monthYear = month.toLocaleString('default', { year: '2-digit' });

        // Format like "Jan '23"
        const monthLabel = `${monthName} '${monthYear}`;

        trendData.push({
          month: monthLabel,
          rate: 0
        });
      }

      return { data: trendData, error: null };
    }

    // Get attendance records for the last 6 months
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, date')
      .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

    if (attendanceError) {
      return { data: null, error: attendanceError };
    }

    // Get member attendance data for these records
    const attendanceIds = attendanceData.map(record => record.id);

    const { data: attendanceRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select('attendance_id, member_id, present')
      .in('attendance_id', attendanceIds);

    if (recordsError) {
      return { data: null, error: recordsError };
    }

    // Calculate attendance rates by month
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const months = [];
    const trendData = [];

    // Generate the last 6 months in reverse order (oldest first)
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentYear, currentMonth - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      const monthYear = month.toLocaleString('default', { year: '2-digit' });

      months.push(month);

      // Format like "Jan '23"
      const monthLabel = `${monthName} '${monthYear}`;

      // Get records for this month
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      // Get attendance records for this month
      const monthAttendance = attendanceData.filter(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return recordDate >= monthStart && recordDate <= monthEnd;
      });

      // Get unique members who attended in this month
      const attendanceIdsForMonth = monthAttendance.map(record => record.id);
      const presentMemberIds = new Set();

      if (attendanceRecords) {
        attendanceRecords.forEach(record => {
          if (attendanceIdsForMonth.includes(record.attendance_id) && record.present) {
            presentMemberIds.add(record.member_id);
          }
        });
      }

      // Calculate attendance rate
      const attendanceRate = totalActiveMembers > 0
        ? (presentMemberIds.size / totalActiveMembers) * 100
        : 0;

      trendData.push({
        month: monthLabel,
        rate: parseFloat(attendanceRate.toFixed(1))
      });
    }

    return { data: trendData, error: null };
  } catch (error) {
    console.error('Error fetching attendance trend data:', error);
    return { data: null, error: error as Error };
  }
}
