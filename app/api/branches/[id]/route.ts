import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Branch from '@/models/Branch';
import { requireBranchAuth } from '@/lib/auth-helpers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { user, error } = await requireBranchAuth();
    if (error) return error;

    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const branch = await Branch.findByIdAndUpdate(id, body, { new: true });
    
    if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(branch);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { user, error } = await requireBranchAuth();
    if (error) return error;

    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    // Basic protection: do not allow deleting if there are active users/products?
    // For now we'll just soft delete or delete entirely, but the user only has basic needs.
    await Branch.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
