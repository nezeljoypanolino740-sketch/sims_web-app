import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { DataTable, type Column } from './DataTable';

interface Row {
  id: string;
  name: string;
}

const columns: Column<Row>[] = [{ key: 'name', header: 'Name', cell: (row) => row.name }];
const empty = { title: 'No students yet', description: 'Add your first student.' };

describe('DataTable', () => {
  it('renders rows', () => {
    render(<DataTable caption="Students" columns={columns} rows={[{ id: '1', name: 'Ana Cruz' }]} rowKey={(r) => r.id} empty={empty} />);
    expect(screen.getByText('Ana Cruz')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  it('shows the empty state when there are no rows', () => {
    render(<DataTable caption="Students" columns={columns} rows={[]} rowKey={(r) => r.id} empty={empty} />);
    expect(screen.getByText('No students yet')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    const onRetry = vi.fn();
    render(<DataTable caption="Students" columns={columns} rows={[]} rowKey={(r) => r.id} empty={empty} error="Cannot reach the server." onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the server.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('pages forward', async () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        caption="Students"
        columns={columns}
        rows={[{ id: '1', name: 'Ana Cruz' }]}
        rowKey={(r) => r.id}
        empty={empty}
        page={1}
        pageSize={10}
        total={25}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText('Showing 1-10 of 25')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('ConfirmDialog', () => {
  it('keeps the dialog open and shows the error when the action fails', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('This student still has grades.'));
    render(<ConfirmDialog open title="Delete student" message="Are you sure?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This student still has grades.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onCancel from the Cancel button', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Archive" message="Archive this student?" confirmLabel="Archive" onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
