import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { ACCOUNT_STATUSES, PAGE_SIZE, ROLE_LABELS, ROLES } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { createUserSchema, type CreateUserFormValues } from '@/lib/schemas/entities';
import { listProfiles, setAccountStatus, setRole } from '@/services/profileService';
import { createUserAccount } from '@/services/userAdminService';
import type { AccountStatus, Profile, Role } from '@/types/models';
import { formatDate, titleCase } from '@/utils/format';
import { toOptions } from '@/utils/options';

const STAFF_ROLE_OPTIONS = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'administrator', label: ROLE_LABELS.administrator },
];

function CreateAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { full_name: '', email: '', password: '', role: 'admin', student_id: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createUserAccount({ email: values.email, password: values.password, full_name: values.full_name, role: values.role });
      toast.success('Account created');
      onCreated();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Modal
      open
      size="sm"
      title="Create staff account"
      description="Student logins are created from the Students page."
      onClose={isSubmitting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="create-user-form" loading={isSubmitting}>Create account</Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Full name" error={errors.full_name?.message} {...register('full_name')} />
        <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <TextField label="Temporary password" type="password" autoComplete="new-password" hint="Share it privately. They can change it after signing in." error={errors.password?.message} {...register('password')} />
        <SelectField label="Role" options={STAFF_ROLE_OPTIONS} error={errors.role?.message} {...register('role')} />
      </form>
    </Modal>
  );
}

function ChangeRoleModal({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: () => void }) {
  const [role, setRoleValue] = useState<Role>(profile.role);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await setRole(profile.id, role);
      toast.success('Role updated');
      onSaved();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      title="Change role"
      description={`${profile.full_name || profile.email}`}
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => void submit()} loading={busy} disabled={role === profile.role}>Save role</Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <SelectField label="Role" options={STAFF_ROLE_OPTIONS} value={role} onChange={(e) => setRoleValue(e.target.value as Role)} />
        <p className="text-sm text-slate-500">Administrators can manage accounts, roles, logs and school settings. Admins run the daily school operations.</p>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const { profile: me } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRoleFilter] = useState<'' | Role>('');
  const [status, setStatus] = useState<'' | AccountStatus>('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [roleTarget, setRoleTarget] = useState<Profile | null>(null);
  const [statusTarget, setStatusTarget] = useState<Profile | null>(null);
  const debounced = useDebounce(search);

  const { data, loading, error, reload } = useAsyncData(
    () => listProfiles({ search: debounced, role: role === '' ? 'all' : role, status: status === '' ? 'all' : status }, page, PAGE_SIZE),
    [debounced, role, status, page],
  );

  const columns: Column<Profile>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (p) => (
        <div>
          <p className="font-medium text-slate-900">
            {p.full_name || '-'} {p.id === me?.id && <span className="text-xs font-normal text-slate-500">(you)</span>}
          </p>
          <p className="break-all text-xs text-slate-500">{p.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (p) => <Badge tone={p.role === 'user' ? 'neutral' : 'brand'}>{ROLE_LABELS[p.role]}</Badge> },
    { key: 'status', header: 'Status', cell: (p) => <Badge tone={statusTone(p.account_status)}>{titleCase(p.account_status)}</Badge> },
    { key: 'created', header: 'Created', cell: (p) => formatDate(p.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (p) => {
        const isSelf = p.id === me?.id;
        return (
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" className="px-3 py-1.5" disabled={isSelf} onClick={() => setStatusTarget(p)}>
              {p.account_status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
            {p.role !== 'user' && (
              <Button variant="ghost" className="px-3 py-1.5" disabled={isSelf} onClick={() => setRoleTarget(p)}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Role
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const nextStatus: AccountStatus = statusTarget?.account_status === 'active' ? 'inactive' : 'active';
  const filtersActive = Boolean(debounced || role || status);

  return (
    <>
      <PageHeader
        title="User management"
        description="Control who can sign in and what they can do. You cannot change your own role or status."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Create staff account
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name or email" label="Search users" />
        <SelectField label="Role" hideLabel placeholder="All roles" options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} value={role} onChange={(e) => { setRoleFilter(e.target.value as '' | Role); setPage(1); }} />
        <SelectField label="Status" hideLabel placeholder="All statuses" options={toOptions(ACCOUNT_STATUSES)} value={status} onChange={(e) => { setStatus(e.target.value as '' | AccountStatus); setPage(1); }} />
      </div>

      <DataTable
        caption="User accounts"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: filtersActive ? 'No accounts match these filters' : 'No accounts yet', description: filtersActive ? 'Try clearing a filter.' : undefined }}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      {creating && <CreateAccountModal onClose={() => setCreating(false)} onCreated={reload} />}
      {roleTarget && <ChangeRoleModal profile={roleTarget} onClose={() => setRoleTarget(null)} onSaved={reload} />}

      <ConfirmDialog
        open={statusTarget !== null}
        title={nextStatus === 'inactive' ? 'Deactivate account' : 'Activate account'}
        tone={nextStatus === 'inactive' ? 'danger' : 'primary'}
        message={
          statusTarget
            ? nextStatus === 'inactive'
              ? `Deactivate ${statusTarget.full_name || statusTarget.email}? They lose access to all school data immediately.`
              : `Activate ${statusTarget.full_name || statusTarget.email}?`
            : ''
        }
        confirmLabel={nextStatus === 'inactive' ? 'Deactivate' : 'Activate'}
        onCancel={() => setStatusTarget(null)}
        onConfirm={async () => {
          if (!statusTarget) return;
          await setAccountStatus(statusTarget.id, nextStatus);
          toast.success(nextStatus === 'inactive' ? 'Account deactivated' : 'Account activated');
          setStatusTarget(null);
          reload();
        }}
      />
    </>
  );
}
