import { Shield } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { UserManagementPanel } from '@/features/settings/settingsPanels'

/** Full-page user management (same data as Settings → User Management). */
export function UsersPage() {
  return (
    <div>
      <PageHeader title="User & Access Management" description="Staff and member accounts." icon={<Shield className="h-7 w-7" />} />
      <UserManagementPanel embedded />
    </div>
  )
}