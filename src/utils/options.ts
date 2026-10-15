import type { SelectOption } from '@/components/ui/SelectField';
import { titleCase } from '@/utils/format';

/** 'on_leave' -> { value: 'on_leave', label: 'On leave' } */
export function toOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: titleCase(value) }));
}

/** Value and label are the same text. */
export function plainOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}
