import { redirect } from 'next/navigation';

// Dashboard root → go straight to the notes workspace
export default function DashboardRootPage() {
  redirect('/notes');
}
