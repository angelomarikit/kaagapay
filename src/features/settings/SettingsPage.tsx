import { Link } from 'react-router-dom'
import { ChevronRight, Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { settingsGroups, settingsHref } from './settingsConfig'

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure cooperative profile, accounting rules, membership policies, and system access."
        icon={<Settings className="h-7 w-7" />}
      />
      <div className="space-y-8">
        {settingsGroups.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-lg font-semibold text-navy">{section.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {section.items.map((item) => (
                <Link key={item.slug} to={settingsHref(item.slug)}>
                  <Card className="cursor-pointer transition hover:border-brand-blue hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-4 text-sm font-medium text-navy">
                      {item.title}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}