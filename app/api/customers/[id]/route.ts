import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import { requireBranchAuth, requireRoles } from '@/lib/auth-helpers';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireBranchAuth();
    if (error) return error;

    const { id } = await params;
    const customer = await Customer.findOne({ _id: id, ...authQuery });
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    delete body.branch;
    
    const customer = await Customer.findOneAndUpdate({ _id: id, ...authQuery }, body, { new: true });
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(customer);
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
    await Customer.findOneAndUpdate({ _id: id, ...authQuery }, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
