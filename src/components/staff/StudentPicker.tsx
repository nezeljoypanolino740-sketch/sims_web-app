import { useMemo, useState } from 'react';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDebounce } from '@/hooks/useDebounce';
import { searchStudentOptions, type StudentOption } from '@/services/studentService';

interface StudentPickerProps {
  label?: string;
  value: string;
  onChange: (studentId: string) => void;
  error?: string | undefined;
  /** The currently selected student (needed when editing an existing record). */
  initial?: StudentOption | null;
  disabled?: boolean;
  placeholder?: string;
}

/** Type to search students by name or number, then choose one from the list. */
export function StudentPicker({
  label = 'Student',
  value,
  onChange,
  error,
  initial = null,
  disabled,
  placeholder = 'Choose a student',
}: StudentPickerProps) {
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState<StudentOption | null>(initial);
  const debounced = useDebounce(term, 300);
  const { data } = useAsyncData(() => searchStudentOptions(debounced), [debounced]);

  const options = useMemo(() => {
    const found = data ?? [];
    const list = picked && !found.some((s) => s.id === picked.id) ? [picked, ...found] : found;
    return list.map((s) => ({ value: s.id, label: `${s.last_name}, ${s.first_name} (${s.student_number})` }));
  }, [data, picked]);

  return (
    <div className="space-y-2">
      <TextField
        label={`Find ${label.toLowerCase()}`}
        type="search"
        placeholder="Type a name or student number"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        disabled={disabled}
      />
      <SelectField
        label={label}
        value={value}
        options={options}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        onChange={(event) => {
          const id = event.target.value;
          setPicked((data ?? []).find((s) => s.id === id) ?? (picked?.id === id ? picked : null));
          onChange(id);
        }}
      />
    </div>
  );
}
