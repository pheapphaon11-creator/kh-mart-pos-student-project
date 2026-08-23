import { requireRoles } from '@/lib/auth-helpers';
import { getDashboardData } from '@/lib/api/dashboard';
import DashboardClient from './DashboardClient';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { query: authQuery, error, user } = await requireRoles(['superadmin', 'admin', 'manager']);
  
  if (user?.role === 'superadmin') {
    redirect('/branches');
  }

  if (error) {
    return <div>Unauthorized</div>;
  }

  // Fetch initial data on the server for the "today" period so it loads instantly
  const initialData = await getDashboardData(authQuery, 'today');

  return <DashboardClient initialData={initialData as any} />;
}
