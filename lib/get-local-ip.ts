import os from 'os';

export function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Find IPv4 and skip loopback/internal (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        const ip = net.address;
        
        // Skip link-local APIPA addresses (169.254.x.x)
        if (ip.startsWith('169.254.')) {
          continue;
        }
        candidates.push(ip);
      }
    }
  }

  // Prioritize typical physical LAN addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const bestCandidate = candidates.find(ip => 
    ip.startsWith('192.168.') || 
    ip.startsWith('10.') || 
    /^(172)\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );

  return bestCandidate || candidates[0] || 'localhost';
}
