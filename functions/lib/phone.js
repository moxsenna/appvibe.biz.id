/**
 * Canonical Indonesian WhatsApp number normalization.
 *
 * Single source of truth for phone identity across checkout, webhook,
 * magic-link login, and D1 queries. The database always stores the
 * canonical E.164 form `+628xxxxxxxxxx`. Raw input is never used as an
 * identity key.
 *
 * Rules:
 *   081234567890   -> +6281234567890
 *   81234567890    -> +6281234567890
 *   +6281234567890 -> +6281234567890
 *   6281234567890  -> +6281234567890
 *
 * Non-Indonesian numbers and invalid formats are rejected.
 */

const MIN_NSN = 9;  // national significant number (after the 62 country code)
const MAX_NSN = 12;

/** Strip decorative characters: whitespace, dashes, dots, parentheses. */
function clean(input) {
  return String(input ?? '').replace(/[\s\-().]/g, '');
}

/**
 * Validate that a cleaned, plus-stripped digit string is an Indonesian
 * mobile number and return its national significant number (without 62).
 */
function extractNational(cleaned) {
  let digits = cleaned;
  if (digits.startsWith('+')) digits = digits.slice(1);

  if (!/^[0-9]+$/.test(digits)) {
    throw new InvalidPhoneError('Phone contains non-numeric characters');
  }

  let national;
  if (digits.startsWith('62')) {
    national = digits.slice(2);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else if (digits.startsWith('8')) {
    national = digits;
  } else {
    throw new InvalidPhoneError('Not an Indonesian number');
  }

  if (!national.startsWith('8')) {
    throw new InvalidPhoneError('Indonesian mobile numbers must start with 8');
  }

  if (national.length < MIN_NSN || national.length > MAX_NSN) {
    throw new InvalidPhoneError(`Invalid length (${national.length} digits)`);
  }

  return national;
}

export class InvalidPhoneError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPhoneError';
  }
}

/**
 * Normalize any supported Indonesian mobile input to canonical `+62...`.
 * @param {string} input
 * @returns {string} e.g. "+6281234567890"
 * @throws {InvalidPhoneError}
 */
export function normalizePhone(input) {
  const cleaned = clean(input);
  if (!cleaned) throw new InvalidPhoneError('Phone is required');
  const national = extractNational(cleaned);
  return `+62${national}`;
}

/** True when the input is a valid Indonesian mobile number. */
export function isValidIndonesianMobile(input) {
  try {
    normalizePhone(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert canonical `+62...` to the target form Fonnte expects: digits
 * only, no leading plus (e.g. "6281234567890").
 * @param {string} phoneE164
 * @returns {string}
 */
export function toFonnteTarget(phoneE164) {
  return String(phoneE164).replace(/^\+/, '');
}
