import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { requireBranchAuth, requireRoles } from '@/lib/auth-helpers';

export async function GET() {
  try {
    await dbConnect();
    const { user, query, error } = await requireBranchAuth();
    if (error) return error;

    const categories = await Category.find(query).sort({ name: 1 });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { user, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const body = await req.json();
    if (user.role !== 'superadmin') body.branch = user.branchId;

    const category = await Category.create(body);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
