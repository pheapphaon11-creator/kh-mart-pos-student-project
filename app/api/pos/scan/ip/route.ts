import { NextResponse } from 'next/server';
import { getLocalIp } from '@/lib/get-local-ip';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || '';
    
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    
    let scanUrl = '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

    if (isLocal) {
      const port = host.split(':')[1] || '3000';
      const localIp = getLocalIp();
      scanUrl = `http://${localIp}:${port}/scan?session=${sessionId}`;
    } else {
      // Public cloud URL (e.g. Vercel)
      scanUrl = `${protocol}://${host}/scan?session=${sessionId}`;
    }

    return NextResponse.json({
      isLocal,
      host,
      scanUrl
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
