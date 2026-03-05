import { redirect } from 'next/navigation';

// Root → redirect to /notes (middleware handles auth gate)
export default function RootPage() {
  redirect('/notes');
}
