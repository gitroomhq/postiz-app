import { redirect } from 'next/navigation';
import { Metadata } from 'next';

// `/admin/login` is the "hidden direct path" admins bookmark. The actual
// login UI lives in the Postiz `/auth/login` page (rebranded as "D3 Creator
// — Admin Login"). We alias here so the public-facing admin URL stays
// coherent and the form/cookie/JWT plumbing is reused as-is.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'D3 Creator — Admin Login',
  description: '',
};

export default function AdminLogin() {
  redirect('/auth/login');
}
