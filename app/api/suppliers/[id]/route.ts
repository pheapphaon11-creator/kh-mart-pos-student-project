import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Supplier from '@/models/Supplier';
import { requireRoles } from '@/lib/auth-helpers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    delete body.branch;

    const supplier = await Supplier.findOneAndUpdate({ _id: id, ...authQuery }, body, { new: true });
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    await Supplier.findOneAndUpdate({ _id: id, ...authQuery }, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
