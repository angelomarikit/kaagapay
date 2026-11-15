import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'

export function AdminStubPage({ module }: { module: string }) {
  return (
    <div>
      <PageHeader title={module} description={`${module} — UI shell aligned with KAAGAPAY admin design system.`} />
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title={`${module} module`}
            description="Database tables and CRUD workflows are defined in Supabase migrations 009–010. Wire forms to these tables after SQL execution."
          />
        </CardContent>
      </Card>
    </div>
  )
}