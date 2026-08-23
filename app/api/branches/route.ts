import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Branch from '@/models/Branch';
import { requireBranchAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { user, error } = await requireBranchAuth();
    if (error) return error;

    // Only superadmin can view all branches, others shouldn't access this (or maybe admin views their own)
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const branches = await Branch.find().sort({ createdAt: -1 });
    return NextResponse.json(branches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import User from '@/models/User';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { user, error } = await requireBranchAuth();
    if (error) return error;

    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { adminName, adminEmail, adminPassword, _id, ...branchData } = body;

    // Optional: check if email is already taken before creating the branch
    if (adminEmail) {
      const existingUser = await User.findOne({ email: adminEmail });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use for admin account' }, { status: 400 });
      }
    }

    const branch = await Branch.create(branchData);

    // Create the default admin if credentials are provided
    if (adminName && adminEmail && adminPassword) {
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        branch: branch._id,
        isActive: true,
      });
    }

    return NextResponse.json(branch, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
