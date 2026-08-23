import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ScanEvent from '@/models/ScanEvent';

export const dynamic = 'force-dynamic';

const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || '';

    if (!sessionId) {
      return NextResponse.json({ scannedBarcode: null });
    }

    const query: any = { processed: false, sessionId };

    // Atomically find, update to processed: true, and return the event
    const scan = await ScanEvent.findOneAndUpdate(
      query,
      { processed: true },
      { sort: { createdAt: 1 }, new: true }
    );

    if (scan) {
      console.log(`[SCAN POLL] Found pending scan event! Barcode: "${scan.barcode}" for session: "${sessionId}"`);
      return NextResponse.json({ scannedBarcode: scan.barcode });
    }

    return NextResponse.json({ scannedBarcode: null });
  } catch (err: any) {
    console.error('[SCAN POLL ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { barcode, sessionId } = body;

    console.log(`[SCAN POST] Received scan from phone: Barcode: "${barcode}", Session: "${sessionId}"`);

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const newScan = await ScanEvent.create({
      barcode: barcode.trim(),
      sessionId: sessionId.trim(),
      processed: false
    });

    console.log(`[SCAN POST] Queued successfully:`, newScan);

    return NextResponse.json({ success: true, scan: newScan }, { status: 201 });
  } catch (err: any) {
    console.error('[SCAN POST ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
