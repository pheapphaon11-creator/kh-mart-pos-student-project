import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { requireBranchAuth } from '@/lib/auth-helpers';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let initialSettings = null;
  try {
    await dbConnect();
    const { query, error } = await requireBranchAuth();
    if (!error && query) {
      const settingsDoc = await Settings.findOne(query).lean();
      if (settingsDoc) initialSettings = JSON.parse(JSON.stringify(settingsDoc));
    }
  } catch (err) {
    console.error('Failed to prefetch settings:', err);
  }

  return (
    <div className="app-layout">
      <Sidebar initialSettings={initialSettings} />
      <div className="main-content">
        <Header />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
