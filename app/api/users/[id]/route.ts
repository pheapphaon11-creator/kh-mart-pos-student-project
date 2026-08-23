import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireBranchAuth, requireRoles } from '@/lib/auth-helpers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { user: sessionUser, query: authQuery, error } = await requireBranchAuth();
    if (error) return error;

    const { id } = await params;
    
    // Check permissions: Either you are an admin/superadmin OR you are editing yourself
    const isSelf = String(sessionUser.id) === String(id);
    const hasAdminRole = ['superadmin', 'admin'].includes(sessionUser.role);
    
    if (!isSelf && !hasAdminRole) {
      return NextResponse.json({ error: `Forbidden: sessionUser.id=${sessionUser.id}, targetId=${id}, role=${sessionUser.role}` }, { status: 403 });
    }

    const body = await req.json();

    if (sessionUser.role !== 'superadmin' && body.role === 'superadmin') {
      return NextResponse.json({ error: 'Forbidden to create superadmin. Your role: ' + sessionUser.role }, { status: 403 });
    }

    // Determine query context. If editing self, bypass authQuery just for the lookup 
    // (though they should belong to their own branch anyway).
    const user = await User.findOne(isSelf ? { _id: id } : { _id: id, ...authQuery });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.name) user.name = body.name;
    if (body.email) user.email = body.email;
    
    // Only admins can change roles and active status
    if (hasAdminRole) {
      if (body.role) user.role = body.role;
      if (body.isActive !== undefined) user.isActive = body.isActive;
    }
    
    // Only update branch if superadmin
    if (sessionUser.role === 'superadmin' && body.branch) {
      user.branch = body.branch;
    }

    // Update password if provided, triggering the pre-save hook
    if (body.password) {
      user.password = body.password;
    }

    await user.save();
    
    const { password: _, ...userObj } = user.toObject();
    return NextResponse.json(userObj);
  } catch (error: any) {
    console.error('Users PUT error:', error);
    return NextResponse.json({ error: 'Users API Error: ' + (error.message || String(error)) }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireRoles(['superadmin', 'admin']);
    if (error) return error;

    const { id } = await params;
    await User.findOneAndDelete({ _id: id, ...authQuery });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
