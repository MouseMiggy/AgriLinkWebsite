// Helper function to detect if input is email or phone number
export const isEmail = (input) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

export const isPhoneNumber = (input) => {
  // Remove all non-digit characters
  const cleaned = input.replace(/\D/g, '');
  // Check if it's a valid phone number (10-15 digits)
  return cleaned.length >= 10 && cleaned.length <= 15;
};

export const formatPhoneForFirebase = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Philippine numbers starting with 09
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return `+63${cleaned.substring(1)}`; // Convert 09xxxxxxxxx to +639xxxxxxxxx
  }
  
  // Add country code if not present
  if (cleaned.length === 10) {
    return `+1${cleaned}`; // Default to US/Canada
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  
  return `+${cleaned}`;
};

// Helper function to format phone number for lookup (matches registration format exactly)
export const formatPhoneForLookup = (phone) => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle different input formats
  if (digitsOnly.startsWith('639')) {
    // Already in 639 format, just add +
    return `+${digitsOnly}`;
  } else if (digitsOnly.startsWith('09')) {
    // 09 format, convert to +639
    return `+63${digitsOnly.substring(1)}`;
  } else if (digitsOnly.startsWith('9') && digitsOnly.length === 10) {
    // 9 format (without leading 0), convert to +639
    return `+63${digitsOnly}`;
  }
  
  // Default: assume it needs +63 prefix
  return `+63${digitsOnly.replace(/^0/, '')}`;
};

// Validate email or phone format for registration
export const validateEmailOrPhone = (input) => {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      error: 'Please enter an email address or phone number',
      type: null
    };
  }

  if (isEmail(input)) {
    return {
      isValid: true,
      error: null,
      type: 'email'
    };
  }

  if (isPhoneNumber(input)) {
    return {
      isValid: true,
      error: null,
      type: 'phone'
    };
  }

  return {
    isValid: false,
    error: 'Please enter a valid email address or phone number',
    type: null
  };
};

// Get display text for input type
export const getInputTypeText = (type) => {
  switch (type) {
    case 'email':
      return 'email address';
    case 'phone':
      return 'phone number';
    default:
      return 'email or phone number';
  }
};
