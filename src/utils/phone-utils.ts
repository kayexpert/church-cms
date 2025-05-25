/**
 * Phone number utility functions
 */

/**
 * Normalize a phone number to E.164 format
 * @param phone Phone number to normalize
 * @returns Normalized phone number
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) {
    console.error('Empty phone number provided to normalizePhoneNumber');
    return '';
  }

  console.log(`Normalizing phone number: ${phone}`);

  // Remove all non-digit characters except the + sign
  let digits = phone.replace(/[^\d+]/g, '');

  // If the number already has a + prefix, keep it as is
  if (digits.startsWith('+')) {
    console.log(`Phone number already has + prefix: ${digits}`);
    return digits;
  }

  // If it starts with 0, replace it with the country code (233 for Ghana)
  if (digits.startsWith('0')) {
    digits = `233${digits.substring(1)}`;
    console.log(`Replaced leading 0 with country code: ${digits}`);
  }
  // If it doesn't have a country code (length <= 10), add it
  else if (digits.length <= 10) {
    digits = `233${digits}`;
    console.log(`Added country code to short number: ${digits}`);
  }

  // Add the + prefix
  digits = `+${digits}`;
  console.log(`Final normalized phone number: ${digits}`);

  return digits;
}

/**
 * Validate a phone number
 * @param phone Phone number to validate
 * @returns True if the phone number is valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) {
    return false;
  }

  try {
    const normalized = normalizePhoneNumber(phone);
    // Check if the normalized phone is valid (not empty and has at least 10 digits)
    return !!normalized && normalized.replace(/\D/g, '').length >= 10;
  } catch (error) {
    console.error('Error validating phone number:', error);
    return false;
  }
}
