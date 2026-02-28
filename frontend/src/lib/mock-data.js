// Mock Data for fallback
export const mockStats = {
  total_expected: 150,
  scanned: 45,
  missing: 105,
  surplus: 2,
  missing_awbs: ['TH111111111', 'TH222222222', 'TH333333333'],
  surplus_awbs: ['UNKNOWN123', 'UNKNOWN456'],
};

export const mockHistory = [
  { id: 1, awb: 'TH123456789', status: 'match', scanned_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 2, awb: 'TH987654321', status: 'match', scanned_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
  { id: 3, awb: 'TH555555555', status: 'duplicate', scanned_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: 4, awb: 'UNKNOWN123', status: 'surplus', scanned_at: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
];

export const mockIpData = {
  origin: 'http://localhost:3000'
};

export const mockUploadResponse = {
  message: 'อัปโหลดไฟล์จำลองสำเร็จ (โหมดสาธิต)',
  count: 150
};

export const mockScanResponse = (awb) => {
  // Simulate random outcomes for demo
  const rand = Math.random();
  if (rand > 0.8) return { status: 'surplus', message: 'ไม่อยู่ในรายการ (จำลอง)', awb };
  if (rand > 0.6) return { status: 'duplicate', message: 'สแกนซ้ำ (จำลอง)', awb };
  return { status: 'match', message: 'จับคู่สำเร็จ (จำลอง)', awb };
};
