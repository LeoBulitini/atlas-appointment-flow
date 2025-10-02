// Utility functions for phone number formatting

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it starts with country code
  const hasCountryCode = cleaned.startsWith('55');
  const numbers = hasCountryCode ? cleaned.slice(2) : cleaned;
  
  // Format as +55 (xx) xxxxx-xxxx
  if (numbers.length === 11) {
    return `+55 (${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  
  // Format as +55 (xx) xxxx-xxxx for landline
  if (numbers.length === 10) {
    return `+55 (${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  
  return phone; // Return original if doesn't match expected format
};

export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  const hasCountryCode = cleaned.startsWith('55');
  const numbers = hasCountryCode ? cleaned.slice(2) : cleaned;
  
  // Valid if 10 or 11 digits (with or without country code)
  return numbers.length === 10 || numbers.length === 11;
};

export const maskPhoneInput = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return `+55 (${cleaned}`;
  if (cleaned.length <= 7) return `+55 (${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 11) {
    return `+55 (${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  
  return `+55 (${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};
