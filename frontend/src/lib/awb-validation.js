/**
 * AWB Validation Module (Frontend)
 * ตรวจสอบรูปแบบเลขพัสดุ (AWB) ก่อนส่งไปยัง API
 * 
 * Supported prefixes:
 *  - 864  (Flash Express)
 *  - 795  (TikTok / J&T Express)
 *  - TH   (Thailand Post / Kerry Express)
 *  - SDOF (จ.ส่งด่วน)
 *  - SM   (Shopee Express)
 *  - SPX  (Shopee Express)
 *  - KE   (Kerry Express)
 *  - NJ   (Ninja Van)
 *  - JT   (J&T Express)
 *  - RL   (Best Express)
 *  - DHL  (DHL)
 *  - EMS  (EMS)
 */

// Valid AWB prefixes — case-insensitive matching
export const VALID_PREFIXES = [
  '864',
  '795',
  'TH',
  'SDOF',
  'SM',
  'SPX',
  'KE',
  'NJ',
  'JT',
  'RL',
  'DHL',
  'EMS',
];

// Minimum AWB length to be considered valid
export const MIN_AWB_LENGTH = 6;

/**
 * Validate an AWB number
 * @param {string} awb - The AWB number to validate
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateAwb(awb) {
  if (!awb || typeof awb !== 'string') {
    return { valid: false, error: 'กรุณาระบุเลขพัสดุ' };
  }

  const trimmed = awb.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'กรุณาระบุเลขพัสดุ' };
  }

  if (trimmed.length < MIN_AWB_LENGTH) {
    return { valid: false, error: `เลขพัสดุสั้นเกินไป (ต้องมีอย่างน้อย ${MIN_AWB_LENGTH} ตัวอักษร)` };
  }

  const upperAwb = trimmed.toUpperCase();
  const hasValidPrefix = VALID_PREFIXES.some(prefix => upperAwb.startsWith(prefix));

  if (!hasValidPrefix) {
    return {
      valid: false,
      error: `เลขพัสดุไม่ถูกต้อง — ต้องขึ้นต้นด้วย: ${VALID_PREFIXES.join(', ')}`,
    };
  }

  return { valid: true };
}
