import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

export default function UnauthorizedPage() {
  return (
    <AuthShell title="You do not have access to this page">
      <div className="space-y-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-slate-700">Your role does not include this area. Go back to your own dashboard.</p>
        <Link to="/" className="inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Go to my dashboard
        </Link>
      </div>
    </AuthShell>
  );
}
