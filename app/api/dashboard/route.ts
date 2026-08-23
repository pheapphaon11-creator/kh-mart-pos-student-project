import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth-helpers';
import { getDashboardData } from '@/lib/api/dashboard';

export async function GET(req: Request) {
  try {
    const { query: authQuery, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today';

    const data = await getDashboardData(authQuery, period);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
