import { DashboardOverviewScreen } from '@/containers/screens/dashboard';

export default function DashboardOverviewPage() {
  // Data is already prefetched server-side in the layout
  // No client-side session calls or additional prefetching needed
  return <DashboardOverviewScreen />;
}
