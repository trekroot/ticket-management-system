/**
 * Static seating configuration for the stadium
 *
 * sectionType (for matching):
 *   - supporters: sections 118-120
 *   - standard: sections 100-117
 *   - standing_room: SRO
 *   - deweys: sections 1-6
 *   - highroller: FC-1 through FC-7
 */

export const SEATING_FORMATS = {
  ga: {
    sections: [119, 120, 'standing_room'],
    generalAdmission: true
  },
  standard: {
    sections: Array.from({ length: 19 }, (_, i) => 100 + i), // 100-118
    generalAdmission: false,
    rows: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    seats: Array.from({ length: 20 }, (_, i) => i)
  },
  deweys: {
    sections: [1, 2, 3, 4, 5, 6],
    generalAdmission: false,
    seats: Array.from({ length: 50 }, (_, i) => i)
  },
  highroller: {
    sections: ['FC-1', 'FC-2', 'FC-3', 'FC-4', 'FC-5', 'FC-6', 'FC-7'],
    generalAdmission: false,
    seats: Array.from({ length: 20 }, (_, i) => i)
  }
};

/**
 * Section groups with labels for frontend dropdowns
 */
export const SECTION_GROUPS = {
  supporters: {
    label: 'Supporters Section',
    sections: [118, 119, 120]
  },
  standard: {
    label: 'Standard Seating',
    sections: Array.from({ length: 18 }, (_, i) => 100 + i) // 100-117
  },
  deweys: {
    label: '$3 Deweys',
    sections: [1, 2, 3, 4, 5, 6]
  },
  highroller: {
    label: 'Highroller',
    sections: ['FC-1', 'FC-2', 'FC-3', 'FC-4', 'FC-5', 'FC-6', 'FC-7']
  },
  standing_room: {
    label: 'Standing Room',
    sections: ['General Admission']
  }
};

/**
 * Convert sectionType key to human-readable label
 * @param {string} sectionType
 * @returns {string} human-readable label
 */
export function getSectionTypeLabel(sectionType) {
  return SECTION_GROUPS[sectionType]?.label || sectionType;
}

/**
 * Map section number/identifier to sectionType
 * @param {number|string} section - Section number or identifier
 * @returns {string|null} sectionType or null if not found
 */
export function getSectionType(section) {
  // Highroller: FC-1 through FC-7
  if (typeof section === 'string' && section.startsWith('FC-')) {
    return 'highroller';
  }

  // Standing room
  if (section === 'standing_room' || section === 'sro') {
    return 'standing_room';
  }

  const num = Number(section);

  // Supporters: 118-120
  if (num >= 118 && num <= 120) {
    return 'supporters';
  }

  // Standard: 100-117
  if (num >= 100 && num <= 117) {
    return 'standard';
  }

  // Deweys: 1-6
  if (num >= 1 && num <= 6) {
    return 'deweys';
  }

  return null;
}

/**
 * Get seating format for a sectionType
 * @param {string} sectionType
 * @returns {object|null} format config or null
 */
export function getSeatingFormat(sectionType) {
  switch (sectionType) {
    case 'supporters':
      // 118 uses standard format, 119-120 use GA
      return { standard: SEATING_FORMATS.standard, ga: SEATING_FORMATS.ga };
    case 'standard':
      return SEATING_FORMATS.standard;
    case 'standing_room':
      return SEATING_FORMATS.ga;
    case 'deweys':
      return SEATING_FORMATS.deweys;
    case 'highroller':
      return SEATING_FORMATS.highroller;
    default:
      return null;
  }
}

/**
 * Check if a section uses general admission (no assigned seats)
 * @param {number|string} section
 * @returns {boolean}
 */
export function isGeneralAdmission(section) {
  if (section === 'standing_room') return true;
  const num = Number(section);
  return num === 119 || num === 120;
}

/**
 * Validate seat details for a given section
 * @param {object} params - { section, row, seat, ticketNumber }
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSeatDetails({ section, row, seat, ticketNumber }) {
  const sectionType = getSectionType(section);

  if (!sectionType) {
    return { valid: false, error: `Invalid section: ${section}` };
  }

  // GA sections don't need seat details
  if (isGeneralAdmission(section)) {
    return { valid: true };
  }

  // Standard seating (100-118)
  if (sectionType === 'standard' || (sectionType === 'supporters' && section === 118)) {
    if (!row || !SEATING_FORMATS.standard.rows.includes(row.toUpperCase())) {
      return { valid: false, error: `Invalid row: ${row}. Must be A-Z` };
    }
    if (!seat || seat < 1 || seat > 20) {
      return { valid: false, error: `Invalid seat: ${seat}. Must be 1-20` };
    }
    return { valid: true };
  }

  // Deweys
  if (sectionType === 'deweys') {
    if (!ticketNumber || ticketNumber < 1 || ticketNumber > 50) {
      return { valid: false, error: `Invalid ticket number: ${ticketNumber}. Must be 1-50` };
    }
    return { valid: true };
  }

  // Highroller
  if (sectionType === 'highroller') {
    if (!ticketNumber || ticketNumber < 1 || ticketNumber > 20) {
      return { valid: false, error: `Invalid ticket number: ${ticketNumber}. Must be 1-20` };
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Get the seating format for a specific section number
 * This maps from actual section → seating format (not sectionType)
 *
 * Key distinction:
 *   getSectionType(118) → 'supporters' (for matching)
 *   getSeatingFormatForSection(118) → standard format (for seat entry)
 *
 * @param {number|string} section
 * @returns {object|null} { formatType, format } or null
 */
export function getSeatingFormatForSection(section) {
  // Highroller
  if (typeof section === 'string' && section.startsWith('FC-')) {
    return { formatType: 'highroller', format: SEATING_FORMATS.highroller };
  }

  // Standing room - GA
  if (section === 'standing_room') {
    return { formatType: 'ga', format: SEATING_FORMATS.ga };
  }

  const num = Number(section);

  // 119, 120 - GA (supporters but GA format)
  if (num === 119 || num === 120) {
    return { formatType: 'ga', format: SEATING_FORMATS.ga };
  }

  // 100-118 - Standard seating (includes 118 which is supporters)
  if (num >= 100 && num <= 118) {
    return { formatType: 'standard', format: SEATING_FORMATS.standard };
  }

  // Deweys 1-6
  if (num >= 1 && num <= 6) {
    return { formatType: 'deweys', format: SEATING_FORMATS.deweys };
  }

  return null;
}