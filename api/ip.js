import os from 'os';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const protoHeader = req.headers['x-forwarded-proto'];
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : (protoHeader || 'http');
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  
  // Get LAN IP
  const interfaces = os.networkInterfaces();
  let lanIp = 'localhost';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        lanIp = iface.address;
        break;
      }
    }
    if (lanIp !== 'localhost') break;
  }

  const origin = host ? `${protocol}://${host}` : 'http://localhost:3000';
  
  res.json({ origin, ip: lanIp });
}
