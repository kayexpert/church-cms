/**
 * Utility functions for member data transformation
 */

/**
 * Transform database member data to UI member data
 * Handles the nested structure of departments and certificates
 */
export function transformDatabaseMemberToUIMember(dbMember: any) {
  // Ensure we have a valid member object
  if (!dbMember) {
    return null;
  }

  // Extract department IDs from the nested structure
  let departments: string[] = [];
  if (dbMember.member_departments && Array.isArray(dbMember.member_departments)) {
    departments = dbMember.member_departments
      .filter((dept: any) => dept && dept.department_id) // Filter out any invalid entries
      .map((dept: any) => dept.department_id);
  } else if (dbMember.departments && Array.isArray(dbMember.departments)) {
    // Handle case where departments might already be an array of IDs
    departments = dbMember.departments.filter((id: any) => id); // Filter out any null/undefined values
  }

  // Log departments extraction for debugging
  console.log('Extracted departments:', {
    hasMemberDepartments: !!dbMember.member_departments,
    memberDepartmentsIsArray: Array.isArray(dbMember.member_departments),
    memberDepartmentsLength: dbMember.member_departments?.length,
    hasDepartments: !!dbMember.departments,
    departmentsIsArray: Array.isArray(dbMember.departments),
    departmentsLength: dbMember.departments?.length,
    extractedDepartments: departments
  });

  // Extract certificate IDs from the nested structure
  let certificates: string[] = [];
  if (dbMember.member_certificates && Array.isArray(dbMember.member_certificates)) {
    certificates = dbMember.member_certificates
      .filter((cert: any) => cert && cert.certificate_id) // Filter out any invalid entries
      .map((cert: any) => cert.certificate_id);
  } else if (dbMember.certificates && Array.isArray(dbMember.certificates)) {
    // Handle case where certificates might already be an array of IDs
    certificates = dbMember.certificates.filter((id: any) => id); // Filter out any null/undefined values
  }

  // Log certificates extraction for debugging
  console.log('Extracted certificates:', {
    hasMemberCertificates: !!dbMember.member_certificates,
    memberCertificatesIsArray: Array.isArray(dbMember.member_certificates),
    memberCertificatesLength: dbMember.member_certificates?.length,
    hasCertificates: !!dbMember.certificates,
    certificatesIsArray: Array.isArray(dbMember.certificates),
    certificatesLength: dbMember.certificates?.length,
    extractedCertificates: certificates
  });

  // Transform to UI member format
  return {
    id: dbMember.id,
    firstName: dbMember.first_name,
    middleName: dbMember.middle_name,
    lastName: dbMember.last_name,
    email: dbMember.email,
    primaryPhoneNumber: dbMember.primary_phone_number,
    secondaryPhoneNumber: dbMember.secondary_phone_number,
    status: dbMember.status,
    gender: dbMember.gender,
    dateOfBirth: dbMember.date_of_birth,
    address: dbMember.address,
    occupation: dbMember.occupation,
    maritalStatus: dbMember.marital_status,
    spouseName: dbMember.spouse_name,
    numberOfChildren: dbMember.number_of_children,
    baptismDate: dbMember.baptism_date,
    departments, // Use the extracted departments
    certificates, // Use the extracted certificates
    covenantFamily: dbMember.covenant_family_id,
    profileImage: dbMember.profile_image,
    emergencyContactName: dbMember.emergency_contact_name,
    emergencyContactPhone: dbMember.emergency_contact_phone,
    emergencyContactRelationship: dbMember.emergency_contact_relationship,
    notes: dbMember.notes,
    membershipDate: dbMember.membership_date,
  };
}

/**
 * Transform UI member data to database member data
 */
export function transformUIMemberToDatabaseMember(uiMember: any) {
  return {
    first_name: uiMember.firstName,
    middle_name: uiMember.middleName || undefined,
    last_name: uiMember.lastName,
    gender: uiMember.gender || undefined,
    date_of_birth: uiMember.dateOfBirth ?
      (typeof uiMember.dateOfBirth === 'string' ?
        uiMember.dateOfBirth :
        new Date(uiMember.dateOfBirth).toISOString().split('T')[0])
      : undefined,
    primary_phone_number: uiMember.primaryPhoneNumber || undefined,
    secondary_phone_number: uiMember.secondaryPhoneNumber || undefined,
    email: uiMember.email || undefined,
    address: uiMember.address || undefined,
    occupation: uiMember.occupation || undefined,
    marital_status: uiMember.maritalStatus || undefined,
    spouse_name: uiMember.spouseName || undefined,
    number_of_children: uiMember.numberOfChildren || undefined,
    status: uiMember.status || 'active',
    profile_image: uiMember.profileImage || undefined,
    emergency_contact_name: uiMember.emergencyContactName || undefined,
    emergency_contact_relationship: uiMember.emergencyContactRelationship || undefined,
    emergency_contact_phone: uiMember.emergencyContactPhone || undefined,
    covenant_family_id: uiMember.covenantFamily || undefined,
    baptism_date: uiMember.baptismDate || undefined,
    notes: uiMember.notes || undefined,
    membership_date: uiMember.membershipDate || undefined,
  };
}
