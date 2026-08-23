import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';
import { requireBranchAuth, requireRoles } from '@/lib/auth-helpers';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query, error } = await requireBranchAuth();
    if (error) return error;

    const { id } = await params;
    const sale = await Sale.findOne({ _id: id, ...query })
      .populate('cashier', 'name email')
      .populate('customer', 'name phone email');
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(sale);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    delete body.branch;

    const sale = await Sale.findOneAndUpdate({ _id: id, ...query }, body, { new: true });
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(sale);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
