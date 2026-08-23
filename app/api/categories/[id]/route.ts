import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { requireRoles } from '@/lib/auth-helpers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    delete body.branch;
    
    const category = await Category.findOneAndUpdate({ _id: id, ...query }, body, { new: true });
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(category);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    await Category.findOneAndDelete({ _id: id, ...query });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
