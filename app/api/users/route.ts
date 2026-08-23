import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireRoles } from '@/lib/auth-helpers';

export async function GET() {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireRoles(['superadmin', 'admin']);
    if (error) return error;

    const users = await User.find(authQuery, '-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { user: sessionUser, error } = await requireRoles(['superadmin', 'admin']);
    if (error) return error;

    const body = await req.json();

    if (sessionUser.role !== 'superadmin') {
      body.branch = sessionUser.branchId;
      if (body.role === 'superadmin') {
        return NextResponse.json({ error: 'Cannot create superadmin' }, { status: 403 });
      }
    }

    const existing = await User.findOne({ email: body.email });
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    
    const user = await User.create(body);
    const { password: _, ...userObj } = user.toObject();
    return NextResponse.json(userObj, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
