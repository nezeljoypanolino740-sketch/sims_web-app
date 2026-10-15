import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { getErrorMessage } from '@/lib/errors';
import { studentAccountSchema, type StudentAccountValues } from '@/lib/schemas/entities';
import { createUserAccount } from '@/services/userAdminService';
import type { Student } from '@/types/models';
import { studentFullName } from '@/utils/format';

interface Props {
  student: Student;
  onClose: () => void;
  onCreated: () => void;
}

/** Admin-approved account creation: the server creates the login and links it to this student record. */
export function CreateStudentAccountModal({ student, onClose, onCreated }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentAccountValues>({ resolver: zodResolver(studentAccountSchema), defaultValues: { password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createUserAccount({
        email: student.email,
        password: values.password,
        full_name: studentFullName(student),
        role: 'user',
        student_id: student.id,
      });
      toast.success('Account created and linked');
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
      title="Create student login"
      description={`${studentFullName(student)} - ${student.email}`}
      onClose={isSubmitting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="student-account-form" loading={isSubmitting}>
            Create login
          </Button>
        </>
      }
    >
      <form id="student-account-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="Temporary password"
          type="password"
          autoComplete="new-password"
          hint="Give this to the student privately. They can change it under Profile and password."
          error={errors.password?.message}
          {...register('password')}
        />
      </form>
    </Modal>
  );
}
