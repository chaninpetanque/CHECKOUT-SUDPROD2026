// Mock Data for fallback
export const mockStats = {
  total_expected: 150,
  scanned: 45,
  missing: 105,
  surplus: 2
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
  message: 'Mock file uploaded successfully (Demo Mode)',
  count: 150
};

export const mockScanResponse = (awb) => {
  // Simulate random outcomes for demo
  const rand = Math.random();
  if (rand > 0.8) return { status: 'surplus', message: 'Not in manifest (Mock)', awb };
  if (rand > 0.6) return { status: 'duplicate', message: 'Already scanned (Mock)', awb };
  return { status: 'match', message: 'Matched successfully (Mock)', awb };
};
