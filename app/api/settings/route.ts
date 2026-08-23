import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { requireRoles } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { query, user, error } = await requireRoles(['superadmin', 'admin']);
    if (error) return error;

    let settings = await Settings.findOne(query);
    if (!settings) {
      settings = await Settings.create(user.role !== 'superadmin' ? { branch: user.branchId } : {});
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const { query, user, error } = await requireRoles(['superadmin', 'admin']);
    if (error) return error;

    const body = await req.json();
    let settings = await Settings.findOne(query);
    if (!settings) {
      const data = { ...body };
      if (user.role !== 'superadmin') data.branch = user.branchId;
      settings = await Settings.create(data);
    } else {
      delete body.branch; // prevent changing branch ID
      Object.assign(settings, body);
      await settings.save();
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Settings API Error: ' + (error.message || String(error)) }, { status: 500 });
  }
}
