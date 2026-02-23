
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const protoHeader = req.headers['x-forwarded-proto'];
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : (protoHeader || 'http');
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  // Use x-forwarded-for for client IP (works on Vercel and reverse proxies)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

  const origin = host ? `${protocol}://${host}` : 'http://localhost:3000';

  res.json({ origin, ip: clientIp });
}
