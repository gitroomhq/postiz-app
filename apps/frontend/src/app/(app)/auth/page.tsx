import { redirect } from 'next/navigation';
import { Metadata } from 'next';

// D3 Creator is a single-admin showcase. Public self-signup is permanently
// disabled. Anyone hitting the old Postiz register surface is routed to the
// admin login page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'D3 Creator',
  description: '',
};

export default function AuthRoot() {
  redirect('/admin/login');
}
