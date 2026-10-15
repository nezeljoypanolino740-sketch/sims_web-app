import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

/** Stands in for a module until its stage is delivered. Navigation, layout and guards around it are final. */
export function ModulePlaceholder({ title, stage }: { title: string; stage: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState title={`${title} arrives in ${stage}`} description="The navigation, layout and access rules around this page are already in place." />
      </Card>
    </>
  );
}
