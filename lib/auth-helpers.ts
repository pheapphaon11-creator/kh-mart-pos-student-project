import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function requireAuth() {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  
  const user = session.user as any;
  return { user };
}

export async function requireBranchAuth() {
  const { user, error } = await requireAuth();
  if (error) return { error };

  if (user.role === 'superadmin') {
    return { user, query: {} };
  }

  if (!user.branchId) {
    return { error: NextResponse.json({ error: 'No branch assigned' }, { status: 403 }) };
  }

  return { user, query: { branch: new mongoose.Types.ObjectId(user.branchId) } };
}

export async function requireRoles(allowedRoles: string[]) {
  const { user, query, error } = await requireBranchAuth();
  if (error) return { error };

  if (!allowedRoles.includes(user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 }) };
  }

  return { user, query };
}
