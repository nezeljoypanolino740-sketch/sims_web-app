import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { ENROLLMENT_STATUSES, GENDERS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import {
  studentFormDefaults,
  studentSchema,
  studentToForm,
  toStudentInput,
  type StudentFormValues,
} from '@/lib/schemas/entities';
import { createStudent, updateStudent } from '@/services/studentService';
import type { Student } from '@/types/models';
import { toOptions } from '@/utils/options';

interface StudentFormModalProps {
  /** Pass a student to edit; omit to create. */
  student?: Student | undefined;
  defaultSchoolYear?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function StudentFormModal({ student, defaultSchoolYear = '', onClose, onSaved }: StudentFormModalProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: student ? studentToForm(student) : { ...studentFormDefaults, school_year: defaultSchoolYear },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const input = toStudentInput(values);
      if (student) await updateStudent(student.id, input);
      else await createStudent(input);
      toast.success(student ? 'Student updated' : 'Student added');
      onSaved();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Modal
      open
      size="lg"
      title={student ? 'Edit student' : 'Add student'}
      description="The email must match the email the student will register with."
      onClose={isSubmitting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="student-form" loading={isSubmitting}>
            {student ? 'Save changes' : 'Add student'}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Student number" error={errors.student_number?.message} {...register('student_number')} />
          <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <TextField label="First name" error={errors.first_name?.message} {...register('first_name')} />
          <TextField label="Middle name (optional)" error={errors.middle_name?.message} {...register('middle_name')} />
          <TextField label="Last name" error={errors.last_name?.message} {...register('last_name')} />
          <TextField label="Date of birth" type="date" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
          <SelectField label="Gender (optional)" placeholder="Prefer not to say" options={toOptions(GENDERS)} error={errors.gender?.message} {...register('gender')} />
          <TextField label="Phone (optional)" type="tel" error={errors.phone?.message} {...register('phone')} />
          <TextField label="Grade level" placeholder="e.g. Grade 7" error={errors.grade_level?.message} {...register('grade_level')} />
          <TextField label="Section (optional)" placeholder="e.g. Rizal" error={errors.section?.message} {...register('section')} />
          <TextField label="School year" placeholder="2026-2027" error={errors.school_year?.message} {...register('school_year')} />
          <SelectField label="Enrollment status" options={toOptions(ENROLLMENT_STATUSES)} error={errors.enrollment_status?.message} {...register('enrollment_status')} />
        </div>
        <TextAreaField label="Address (optional)" error={errors.address?.message} {...register('address')} />
      </form>
    </Modal>
  );
}
