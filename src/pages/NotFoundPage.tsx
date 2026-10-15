import { Link } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';

export default function NotFoundPage() {
  return (
    <AuthShell title="Page not found">
      <div className="space-y-4 text-center">
        <p className="text-slate-700">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="inline-block text-sm font-semibold text-brand-700 hover:underline">
          Go to the home page
        </Link>
      </div>
    </AuthShell>
  );
}
